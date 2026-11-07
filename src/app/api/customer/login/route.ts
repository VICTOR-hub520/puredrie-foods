import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: {
      email: parsed.data.email.toLowerCase(),
      isActive: true,
      userRoles: { some: { role: { name: "CUSTOMER" } } },
    },
    select: { id: true, passwordHash: true },
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await createCustomerSession(user.id);
  return NextResponse.json({ message: "Signed in." });
}
