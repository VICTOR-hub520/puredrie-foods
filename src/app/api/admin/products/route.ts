import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: { weightGrams: "asc" },
        include: {
          prices: { where: { validUntil: null }, orderBy: { validFrom: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      weightGrams: variant.weightGrams.toString(),
      isCustom: variant.isCustom,
      price: variant.prices[0]?.amount.toString() ?? null,
    })),
  })));
}
