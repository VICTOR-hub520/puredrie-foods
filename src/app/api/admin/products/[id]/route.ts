import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1000),
  image: z.string().trim().min(1).max(500),
  isActive: z.boolean(),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1).max(40),
    weightGrams: z.number().positive().max(100000),
    amount: z.number().positive().max(100000000),
    isCustom: z.boolean().optional(),
  })).min(1).max(30),
});
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid product details." }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Check the product details, variants, and prices." }, { status: 400 });
  if (new Set(parsed.data.variants.map((variant) => variant.label.toLowerCase())).size !== parsed.data.variants.length) {
    return NextResponse.json({ error: "Each package size must have a unique label." }, { status: 400 });
  }

  const { id } = await params;
  try {
    await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          image: parsed.data.image,
          isActive: parsed.data.isActive,
        },
        select: { id: true },
      });

      for (const draft of parsed.data.variants) {
        let variantId = draft.id;
        if (variantId) {
          const variant = await transaction.productVariant.findFirst({
            where: { id: variantId, productId: product.id },
            select: { id: true },
          });
          if (!variant) throw new Error("A package variant does not belong to this product.");
          await transaction.productVariant.update({
            where: { id: variantId },
            data: {
              label: draft.label,
              weightGrams: new Prisma.Decimal(draft.weightGrams),
            },
          });
        } else {
          const variant = await transaction.productVariant.create({
            data: {
              productId: product.id,
              label: draft.label,
              weightGrams: new Prisma.Decimal(draft.weightGrams),
              isCustom: draft.isCustom ?? true,
            },
            select: { id: true },
          });
          variantId = variant.id;
        }

        const amount = new Prisma.Decimal(draft.amount).toDecimalPlaces(2);
        const current = await transaction.productPrice.findFirst({
          where: { variantId, validUntil: null },
          orderBy: { validFrom: "desc" },
          select: { id: true, amount: true },
        });
        if (!current || !current.amount.equals(amount)) {
          const changedAt = new Date();
          if (current) {
            await transaction.productPrice.update({
              where: { id: current.id },
              data: { validUntil: changedAt },
            });
          }
          await transaction.productPrice.create({
            data: { productId: product.id, variantId, amount, validFrom: changedAt },
          });
        }
      }

      await transaction.auditLog.create({
        data: {
          userId: admin.id,
          action: "PRODUCT_UPDATED",
          entityType: "Product",
          entityId: product.id,
          details: { name: parsed.data.name, variantCount: parsed.data.variants.length },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A package with that size already exists for this product." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "A package variant does not belong to this product.") {
      return NextResponse.json({ error: "A selected package does not belong to this product." }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ message: "Product details and current prices saved." });
}
