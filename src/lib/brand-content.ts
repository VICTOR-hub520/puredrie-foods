import { prisma } from "@/lib/prisma";
import defaults from "../../prisma/brand-content.json";

export type BrandContent = {
  key: string;
  title: string;
  body: string;
  isPublished: boolean;
};

export const brandContentDefaults: BrandContent[] = defaults;

export async function getBrandContent() {
  const saved = await prisma.siteContent.findMany({
    orderBy: { key: "asc" },
  });
  const savedByKey = new Map(saved.map((item) => [item.key, item]));
  return brandContentDefaults.map((item) => {
    const value = savedByKey.get(item.key);
    return value
      ? { key: value.key, title: value.title, body: value.body, isPublished: value.isPublished }
      : item;
  });
}
