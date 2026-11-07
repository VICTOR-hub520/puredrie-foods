import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const hasThreeDecimalPlaces = (value: number) => Number(value.toFixed(3)) === value;
const quantity = z.number().finite().positive().max(999999999).refine(hasThreeDecimalPlaces);
const noteSchema = z.string().trim().max(500).optional();
const maximumStock = new Prisma.Decimal("999999999.999");

const createSchema = z.object({
  action: z.literal("create"),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  inventoryType: z.enum(["BULK", "FINISHED"]),
  reorderLevel: z.number().finite().min(0).max(999999999).refine(hasThreeDecimalPlaces),
});
const receiveSchema = z.object({
  action: z.literal("receive"),
  inventoryId: z.string().uuid(),
  amount: quantity,
  batchNumber: z.string().trim().max(100).optional(),
  note: noteSchema,
});
const adjustSchema = z.object({
  action: z.literal("adjust"),
  inventoryId: z.string().uuid(),
  delta: z.number().finite().refine((value) => value !== 0 && Math.abs(value) <= 999999999 && hasThreeDecimalPlaces(value)),
  batchId: z.string().uuid().optional().nullable(),
  note: z.string().trim().min(2).max(500),
});
const reorderSchema = z.object({
  action: z.literal("reorder"),
  inventoryId: z.string().uuid(),
  reorderLevel: z.number().finite().min(0).max(999999999).refine(hasThreeDecimalPlaces),
});
const requestSchema = z.discriminatedUnion("action", [createSchema, receiveSchema, adjustSchema, reorderSchema]);

class InventoryConflictError extends Error {}

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  const [inventory, products, movements] = await Promise.all([
    prisma.inventory.findMany({
      include: {
        product: { select: { name: true } },
        variant: { select: { label: true, weightGrams: true } },
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          include: { supplier: { select: { name: true } } },
          orderBy: { receivedAt: "asc" },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { inventoryType: "asc" }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        variants: {
          where: { isActive: true },
          select: { id: true, label: true, weightGrams: true },
          orderBy: { weightGrams: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      include: {
        inventory: { include: { product: { select: { name: true } }, variant: { select: { label: true } } } },
        batch: { select: { batchNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    inventory: inventory.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantLabel: item.variant?.label ?? null,
      weightGrams: item.variant?.weightGrams.toString() ?? null,
      inventoryType: item.inventoryType,
      unit: item.unit,
      onHand: item.onHand.toString(),
      reorderLevel: item.reorderLevel.toString(),
      batches: item.batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        quantityRemaining: batch.quantityRemaining.toString(),
        receivedAt: batch.receivedAt,
        supplierName: batch.supplier?.name ?? null,
      })),
    })),
    products: products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({ ...variant, weightGrams: variant.weightGrams.toString() })),
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: movement.quantity.toString(),
      unit: movement.inventory.unit,
      itemName: `${movement.inventory.product.name}${movement.inventory.variant ? ` · ${movement.inventory.variant.label}` : ""}`,
      batchNumber: movement.batch?.batchNumber ?? null,
      note: movement.note,
      createdAt: movement.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid inventory details." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Check the stock details and quantity." }, { status: 400 });

  try {
    await prisma.$transaction(async (transaction) => {
      const action = parsed.data;
      if (action.action === "create") {
        if ((action.inventoryType === "BULK" && action.variantId) || (action.inventoryType === "FINISHED" && !action.variantId)) {
          throw new InventoryConflictError("Choose bulk stock without a package or finished stock with a package.");
        }
        const product = await transaction.product.findUnique({
          where: { id: action.productId },
          select: { id: true },
        });
        if (!product) throw new InventoryConflictError("The selected product was not found.");
        if (action.variantId) {
          const variant = await transaction.productVariant.findFirst({
            where: { id: action.variantId, productId: action.productId, isActive: true },
            select: { id: true },
          });
          if (!variant) throw new InventoryConflictError("The selected package does not belong to this product.");
        }
        const existing = await transaction.inventory.findFirst({
          where: { productId: action.productId, variantId: action.variantId ?? null, inventoryType: action.inventoryType },
          select: { id: true },
        });
        if (existing) throw new InventoryConflictError("That stock item already exists.");
        const item = await transaction.inventory.create({
          data: {
            productId: action.productId,
            variantId: action.variantId ?? null,
            inventoryType: action.inventoryType,
            unit: action.inventoryType === "BULK" ? "g" : "units",
            reorderLevel: new Prisma.Decimal(action.reorderLevel),
          },
        });
        await transaction.auditLog.create({
          data: {
            userId: admin.id,
            action: "INVENTORY_ITEM_CREATED",
            entityType: "Inventory",
            entityId: item.id,
            details: { productId: item.productId, variantId: item.variantId, inventoryType: item.inventoryType },
          },
        });
        return;
      }

      const item = await transaction.inventory.findUnique({ where: { id: action.inventoryId } });
      if (!item) throw new InventoryConflictError("The selected stock item was not found.");

      if (action.action === "reorder") {
        await transaction.inventory.update({
          where: { id: item.id },
          data: { reorderLevel: new Prisma.Decimal(action.reorderLevel) },
        });
        await transaction.auditLog.create({
          data: {
            userId: admin.id,
            action: "INVENTORY_REORDER_LEVEL_UPDATED",
            entityType: "Inventory",
            entityId: item.id,
            details: { previous: item.reorderLevel.toString(), current: action.reorderLevel },
          },
        });
        return;
      }

      if (action.action === "receive") {
        const amount = new Prisma.Decimal(action.amount);
        if (item.onHand.add(amount).gt(maximumStock)) {
          throw new InventoryConflictError("The stock balance would exceed the supported limit.");
        }
        const batch = await transaction.stockBatch.create({
          data: {
            inventoryId: item.id,
            batchNumber: action.batchNumber?.trim() || null,
            quantityReceived: amount,
            quantityRemaining: amount,
            notes: action.note?.trim() || null,
          },
        });
        const updated = await transaction.inventory.updateMany({
          where: { id: item.id, onHand: { lte: maximumStock.sub(amount) } },
          data: { onHand: { increment: amount } },
        });
        if (updated.count !== 1) throw new InventoryConflictError("The stock balance would exceed the supported limit.");
        await transaction.stockMovement.create({
          data: {
            inventoryId: item.id,
            batchId: batch.id,
            movementType: "RECEIPT",
            quantity: amount,
            note: action.note?.trim() || null,
          },
        });
        await transaction.auditLog.create({
          data: {
            userId: admin.id,
            action: "INVENTORY_RECEIVED",
            entityType: "Inventory",
            entityId: item.id,
            details: { amount: amount.toString(), batchNumber: batch.batchNumber },
          },
        });
        return;
      }

      const delta = new Prisma.Decimal(action.delta);
      if (item.onHand.add(delta).gt(maximumStock)) {
        throw new InventoryConflictError("The stock balance would exceed the supported limit.");
      }
      let batchId: string | null = null;
      if (delta.isNegative()) {
        const reduction = delta.abs();
        if (action.batchId) {
          const batchUpdate = await transaction.stockBatch.updateMany({
            where: { id: action.batchId, inventoryId: item.id, quantityRemaining: { gte: reduction } },
            data: { quantityRemaining: { decrement: reduction } },
          });
          if (batchUpdate.count !== 1) throw new InventoryConflictError("The selected batch does not have enough stock.");
          batchId = action.batchId;
        } else {
          const batchTotals = await transaction.stockBatch.aggregate({
            where: { inventoryId: item.id },
            _sum: { quantityRemaining: true },
          });
          const unbatched = item.onHand.sub(batchTotals._sum.quantityRemaining ?? new Prisma.Decimal(0));
          if (unbatched.lt(reduction)) throw new InventoryConflictError("The unbatched stock balance is too low for this adjustment.");
        }
      } else if (action.batchId) {
        throw new InventoryConflictError("Positive adjustments create unbatched stock; receive stock to create a traceable batch.");
      }
      const updated = await transaction.inventory.updateMany({
        where: {
          id: item.id,
          onHand: delta.isNegative() ? { gte: delta.abs() } : { lte: maximumStock.sub(delta) },
        },
        data: { onHand: { increment: delta } },
      });
      if (updated.count !== 1) throw new InventoryConflictError("The stock balance is too low for this adjustment.");
      await transaction.stockMovement.create({
        data: {
          inventoryId: item.id,
          batchId,
          movementType: "ADJUSTMENT",
          quantity: delta,
          note: action.note?.trim() || null,
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: admin.id,
          action: "INVENTORY_ADJUSTED",
          entityType: "Inventory",
          entityId: item.id,
          details: { delta: delta.toString(), batchId },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof InventoryConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Stock changed during this action. Refresh and try again." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ message: "Inventory updated." });
}
