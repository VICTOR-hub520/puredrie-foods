import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(12).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid registration details." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your name, email, phone number, and password. Passwords must be at least 12 characters." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const passwordHash = await hash(parsed.data.password, 12);
  const result = await prisma.$transaction(async (transaction) => {
    const role = await transaction.role.upsert({
      where: { name: "CUSTOMER" },
      update: {},
      create: { name: "CUSTOMER", description: "Customer account access." },
    });
    const user = await transaction.user.create({
      data: {
        name: parsed.data.fullName,
        email,
        passwordHash,
        userRoles: { create: { roleId: role.id } },
      },
    });
    const customer = await transaction.customer.create({
      data: {
        userId: user.id,
        fullName: parsed.data.fullName,
        email,
        phone: parsed.data.phone.replace(/[^\d+]/g, ""),
      },
      select: { id: true },
    });
    return { user, customer };
  });

  await createCustomerSession(result.user.id);
  return NextResponse.json({ message: "Your Puredrie account is ready." }, { status: 201 });
}
