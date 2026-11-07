import { NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/auth";
import { getAvailableCredit } from "@/lib/credit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ eligible: false, availableCredit: "0.00" });

  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ eligible: false, availableCredit: "0.00" });
  const availableCredit = await getAvailableCredit(prisma, customer.id);
  return NextResponse.json({
    eligible: availableCredit.gt(0),
    availableCredit: availableCredit.toFixed(2),
  });
}
