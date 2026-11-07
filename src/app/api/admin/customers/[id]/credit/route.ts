import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  isApproved: z.boolean(),
  creditLimit: z.number().min(0).max(100000000),
  paymentTermDays: z.number().int().min(0).max(365),
  notes: z.string().trim().max(1000).optional(),
});
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid customer credit terms." }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Check the credit approval, limit, and payment terms." }, { status: 400 });
  if (parsed.data.isApproved && parsed.data.creditLimit <= 0) {
    return NextResponse.json({ error: "An approved credit limit must be greater than zero." }, { status: 400 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  const terms = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.customerCreditTerms.upsert({
      where: { customerId: id },
      update: {
        isApproved: parsed.data.isApproved,
        creditLimit: parsed.data.creditLimit,
        paymentTermDays: parsed.data.paymentTermDays,
        notes: parsed.data.notes || null,
      },
      create: {
        customerId: id,
        isApproved: parsed.data.isApproved,
        creditLimit: parsed.data.creditLimit,
        paymentTermDays: parsed.data.paymentTermDays,
        notes: parsed.data.notes || null,
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: admin.id,
        action: "CUSTOMER_CREDIT_TERMS_UPDATED",
        entityType: "Customer",
        entityId: id,
        details: {
          isApproved: saved.isApproved,
          creditLimit: saved.creditLimit.toFixed(2),
          paymentTermDays: saved.paymentTermDays,
        },
      },
    });
    return saved;
  });
  return NextResponse.json({
    isApproved: terms.isApproved,
    creditLimit: terms.creditLimit.toFixed(2),
    paymentTermDays: terms.paymentTermDays,
    notes: terms.notes,
  });
}
