import { NextResponse } from "next/server";
import { getAdminUser, getCustomerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Props) {
  const user = (await getAdminUser()) ?? (await getCustomerUser());
  if (!user) return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });

  const { id } = await params;
  const result = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { readAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ message: "Notification marked as read." });
}
