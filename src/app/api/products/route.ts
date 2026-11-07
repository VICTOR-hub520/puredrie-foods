import { NextResponse } from "next/server";
import { publicProductInclude, serializeCatalogProduct } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: publicProductInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products.map(serializeCatalogProduct));
}
