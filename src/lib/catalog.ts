import type { Prisma } from "@prisma/client";

export const publicProductInclude = {
  variants: {
    where: { isActive: true },
    include: {
      prices: {
        where: { validUntil: null },
        orderBy: { validFrom: "desc" as const },
        take: 1,
      },
    },
    orderBy: { weightGrams: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof publicProductInclude }>;

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: string;
  variants: { id: string; label: string; price: number }[];
};

export type CatalogListing = {
  product: CatalogProduct;
  variant: CatalogProduct["variants"][number];
};

export function expandCatalogVariants(products: CatalogProduct[]): CatalogListing[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
}

export function serializeCatalogProduct(product: ProductRecord): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    image: product.image,
    category: product.category,
    variants: product.variants.flatMap((variant) => {
      const currentPrice = variant.prices[0];
      return currentPrice
        ? [{ id: variant.id, label: variant.label, price: currentPrice.amount.toNumber() }]
        : [];
    }),
  };
}
