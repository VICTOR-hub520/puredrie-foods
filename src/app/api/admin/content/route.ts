import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { brandContentDefaults } from "@/lib/brand-content";
import { prisma } from "@/lib/prisma";

const keys = brandContentDefaults.map((item) => item.key) as [
  string,
  ...string[],
];

const contentSchema = z.object({
  items: z.array(z.object({
    key: z.enum(keys),
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(10).max(5000),
    isPublished: z.boolean(),
  })).length(brandContentDefaults.length),
}).superRefine(({ items }, context) => {
  if (new Set(items.map((item) => item.key)).size !== brandContentDefaults.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Include each brand story section exactly once." });
  }
});

export async function GET() {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }
  const items = await prisma.siteContent.findMany({ orderBy: { key: "asc" } });
  const savedByKey = new Map(items.map((item) => [item.key, item]));
  return NextResponse.json(brandContentDefaults.map((item) => {
    const saved = savedByKey.get(item.key);
    return saved
      ? { key: saved.key, title: saved.title, body: saved.body, isPublished: saved.isPublished }
      : item;
  }));
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid brand content." }, { status: 400 });
  }
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check each title, paragraph and publish setting." }, { status: 400 });
  }

  await prisma.$transaction(async (transaction) => {
    for (const item of parsed.data.items) {
      await transaction.siteContent.upsert({
        where: { key: item.key },
        update: { title: item.title, body: item.body, isPublished: item.isPublished },
        create: item,
      });
    }
    await transaction.auditLog.create({
      data: {
        userId: admin.id,
        action: "BRAND_CONTENT_UPDATED",
        entityType: "SiteContent",
        details: { keys: parsed.data.items.map((item) => item.key) },
      },
    });
  });

  return NextResponse.json({ message: "Brand story saved." });
}
