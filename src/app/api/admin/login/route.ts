import { createHmac } from "node:crypto";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("SESSION_SECRET must be set to at least 32 characters.");
    return NextResponse.json({ error: "Administrator sign-in is not configured." }, { status: 500 });
  }
  const sourceIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHmac("sha256", sessionSecret).update(sourceIp).digest("hex");
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.adminLoginAttempt.deleteMany({ where: { attemptedAt: { lt: cutoff } } });
  const recentAttempts = await prisma.adminLoginAttempt.count({
    where: { ipHash, attemptedAt: { gte: cutoff } },
  });
  if (recentAttempts >= 10) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      email: parsed.data.email.toLowerCase(),
      isActive: true,
      userRoles: { some: { role: { name: "ADMIN" } } },
    },
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    await prisma.adminLoginAttempt.create({ data: { ipHash, userId: user?.id } });
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await createAdminSession(user.id);
  await prisma.adminLoginAttempt.deleteMany({ where: { ipHash } });
  return NextResponse.json({ message: "Signed in." });
}
