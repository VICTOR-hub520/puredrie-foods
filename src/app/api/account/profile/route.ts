import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
});

export async function PATCH(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid profile details." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your name and phone number." }, { status: 400 });

  const customer = await prisma.customer.update({
    where: { userId: user.id },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone.replace(/[^\d+]/g, ""),
    },
    select: { id: true },
  });
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.fullName } });
  return NextResponse.json({ message: "Your contact details were updated.", customerId: customer.id });
}
