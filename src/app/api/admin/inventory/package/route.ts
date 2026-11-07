import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hasThreeDecimalPlaces = (value: number) => Number(value.toFixed(3)) === value;

const schema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  inputInventoryId: z.string().uuid(),
  batchId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive().max(100000),
  packagingLoss: z.number().finite().min(0).max(999999999).refine(hasThreeDecimalPlaces),
});

class PackagingConflictError extends Error {}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid packaging details." }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Check the product, package, and quantities." }, { status: 400 });

  try {
    await prisma.$transaction(async (transaction) => {
      const { productId, variantId, inputInventoryId } = parsed.data;
      const variant = await transaction.productVariant.findFirst({
        where: { id: variantId, productId, isActive: true },
        select: { weightGrams: true },
      });
      const inputInventory = await transaction.inventory.findFirst({
        where: { id: inputInventoryId, productId, variantId: null, inventoryType: "BULK" },
        select: { id: true, onHand: true, unit: true },
      });
      if (!variant || !inputInventory || inputInventory.unit !== "g") {
        throw new PackagingConflictError("Choose a valid active package and matching bulk stock in grams.");
      }

      const packagingSize = variant.weightGrams;
      const packagingLoss = new Prisma.Decimal(parsed.data.packagingLoss);
      const packagedCount = new Prisma.Decimal(parsed.data.quantity);
      const bulkConsumed = packagingSize.mul(packagedCount).add(packagingLoss);
      const batchId = parsed.data.batchId ?? null;
      const maximumStock = new Prisma.Decimal("999999999.999");
      if (bulkConsumed.gt(maximumStock)) {
        throw new PackagingConflictError("The requested packaging quantity exceeds the supported stock balance.");
      }

      if (batchId) {
        const batch = await transaction.stockBatch.updateMany({
          where: {
            id: batchId,
            inventoryId: inputInventory.id,
            quantityRemaining: { gte: bulkConsumed },
          },
          data: { quantityRemaining: { decrement: bulkConsumed } },
        });
        if (batch.count !== 1) throw new PackagingConflictError("The selected batch does not have enough stock.");
      } else {
        const batchTotals = await transaction.stockBatch.aggregate({
          where: { inventoryId: inputInventory.id },
          _sum: { quantityRemaining: true },
        });
        const unbatchedStock = inputInventory.onHand.sub(batchTotals._sum.quantityRemaining ?? new Prisma.Decimal(0));
        if (unbatchedStock.lt(bulkConsumed)) {
          throw new PackagingConflictError("Unbatched bulk stock is too low. Choose an available batch or receive more stock.");
        }
      }

      const inputUpdate = await transaction.inventory.updateMany({
        where: { id: inputInventory.id, onHand: { gte: bulkConsumed } },
        data: { onHand: { decrement: bulkConsumed } },
      });
      if (inputUpdate.count !== 1) throw new PackagingConflictError("Bulk stock is too low for this packaging run.");

      const outputInventory = await transaction.inventory.findFirst({
        where: { productId, variantId, inventoryType: "FINISHED" },
      }) ?? await transaction.inventory.create({
        data: { productId, variantId, inventoryType: "FINISHED", unit: "units" },
      });
      const outputUpdate = await transaction.inventory.updateMany({
        where: { id: outputInventory.id, onHand: { lte: maximumStock.sub(packagedCount) } },
        data: { onHand: { increment: packagedCount } },
      });
      if (outputUpdate.count !== 1) {
        throw new PackagingConflictError("The finished-stock balance would exceed the supported limit.");
      }
      const record = await transaction.packagingRecord.create({
        data: {
          productId,
          variantId,
          inputInventoryId: inputInventory.id,
          outputInventoryId: outputInventory.id,
          batchId,
          quantityPackaged: packagedCount,
          packagingSize,
          bulkStockConsumed: bulkConsumed,
          packagingLoss,
          responsibleUserId: admin.id,
        },
      });
      await transaction.stockMovement.createMany({
        data: [
          {
            inventoryId: inputInventory.id,
            batchId,
            movementType: "PACKAGING_CONSUMPTION",
            quantity: bulkConsumed.negated(),
            referenceType: "PackagingRecord",
            referenceId: record.id,
            note: `${parsed.data.quantity} × ${packagingSize.toString()}g package(s)`,
          },
          {
            inventoryId: outputInventory.id,
            movementType: "PACKAGING_OUTPUT",
            quantity: packagedCount,
            referenceType: "PackagingRecord",
            referenceId: record.id,
            note: `${parsed.data.quantity} finished package(s)`,
          },
        ],
      });
      await transaction.auditLog.create({
        data: {
          userId: admin.id,
          action: "PACKAGING_COMPLETED",
          entityType: "PackagingRecord",
          entityId: record.id,
          details: {
            productId,
            variantId,
            quantityPackaged: parsed.data.quantity,
            bulkStockConsumed: bulkConsumed.toString(),
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof PackagingConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Stock changed during packaging. Refresh and try again." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ message: "Packaging completed and stock balances updated." });
}
