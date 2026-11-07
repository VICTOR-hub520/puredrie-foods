import type { Metadata } from "next";
import { Catalog } from "@/app/shop/catalog";
import { publicProductInclude, serializeCatalogProduct } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop dried fruit and moringa" };

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: publicProductInclude,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });

  return (
    <section className="shop-page section">
      <div className="shop-intro">
        <span className="eyebrow">Puredrie Foods products</span>
        <h1>Fruit and moringa, <em>made simple.</em></h1>
        <p>Shop our dried fruit, moringa powder and moringa teabags. Free delivery within six calendar days.</p>
      </div>
      <Catalog products={products.map(serializeCatalogProduct)} />
    </section>
  );
}
