import "server-only";
import type { Prisma } from "@prisma/client";

type NotificationInput = {
  dedupeKey: string;
  type: string;
  title: string;
  message: string;
  href?: string;
};

export async function notifyActiveAdmins(
  transaction: Prisma.TransactionClient,
  notification: NotificationInput,
) {
  const admins = await transaction.user.findMany({
    where: { isActive: true, userRoles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  if (!admins.length) return;

  await transaction.notification.createMany({
    data: admins.map((admin) => ({
      ...notification,
      dedupeKey: `${notification.dedupeKey}:${admin.id}`,
      userId: admin.id,
    })),
    skipDuplicates: true,
  });
}
