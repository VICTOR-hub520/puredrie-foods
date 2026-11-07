import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderStatusSchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid order update." }, { status: 400 });
  }
  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderStatus: true, delivery: { select: { id: true, status: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (parsed.data.orderStatus === "CANCELLED" && existing.orderStatus === "DELIVERED") {
    return NextResponse.json({ error: "A delivered order cannot be cancelled." }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.update({
      where: { id },
      data: { orderStatus: parsed.data.orderStatus },
      select: { id: true, orderStatus: true, actualDeliveryAt: true },
    });

    if (existing.orderStatus !== order.orderStatus) {
      await transaction.orderStatusHistory.create({
        data: {
          orderId: id,
          changedById: admin.id,
          fromStatus: existing.orderStatus,
          toStatus: order.orderStatus,
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: admin.id,
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: id,
          details: { from: existing.orderStatus, to: order.orderStatus },
        },
      });
    }

    const deliveryStatuses: Record<string, string> = {
      NEW: "SCHEDULED",
      CONFIRMED: "SCHEDULED",
      BEING_PACKED: "PACKING",
      READY_FOR_DISPATCH: "READY",
      OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
      DELIVERED: "DELIVERED",
      CANCELLED: "CANCELLED",
    };
    const deliveryStatus = deliveryStatuses[order.orderStatus];
    const deliveredAt = order.orderStatus === "DELIVERED" ? new Date() : undefined;
    const delivery = existing.delivery
      ? await transaction.delivery.update({
          where: { id: existing.delivery.id },
          data: {
            status: deliveryStatus,
            ...(deliveredAt ? { actualDeliveredAt: deliveredAt } : {}),
          },
        })
      : await transaction.delivery.create({
          data: {
            orderId: id,
            status: deliveryStatus,
            ...(deliveredAt ? { actualDeliveredAt: deliveredAt } : {}),
          },
        });
    if (!existing.delivery || existing.delivery.status !== delivery.status) {
      await transaction.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          changedById: admin.id,
          fromStatus: existing.delivery?.status ?? null,
          toStatus: delivery.status,
          ...(order.orderStatus === "CANCELLED" ? { note: "Delivery cancelled with the order." } : {}),
          ...(order.orderStatus === "DELIVERED" ? { note: "Order marked delivered from order management." } : {}),
        },
      });
    }
    if (deliveredAt) {
      await transaction.order.update({
        where: { id },
        data: { actualDeliveryAt: deliveredAt },
      });
    }

    return order;
  });
  return NextResponse.json(updated);
}
