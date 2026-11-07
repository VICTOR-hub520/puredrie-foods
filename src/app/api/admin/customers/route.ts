import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableCredit } from "@/lib/credit";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  const customers = await prisma.customer.findMany({
    include: {
      creditTerms: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const results = await Promise.all(customers.map(async (customer) => ({
    id: customer.id,
    hasAccount: customer.userId !== null,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt,
    orderCount: customer._count.orders,
    creditTerms: customer.creditTerms
      ? {
          isApproved: customer.creditTerms.isApproved,
          creditLimit: customer.creditTerms.creditLimit.toString(),
          paymentTermDays: customer.creditTerms.paymentTermDays,
          notes: customer.creditTerms.notes,
        }
      : null,
    availableCredit: customer.creditTerms?.isApproved
      ? (await getAvailableCredit(prisma, customer.id)).toString()
      : "0.00",
  })));
  return NextResponse.json(results);
}
