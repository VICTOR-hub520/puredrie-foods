import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/app/shop/[slug]/product-actions";
import { ProductCard } from "@/components/product-card";
import { expandCatalogVariants, publicProductInclude, serializeCatalogProduct } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({ where: { slug, isActive: true } });
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: publicProductInclude,
  });
  if (!product) notFound();
  const related = await prisma.product.findMany({
    where: { isActive: true, category: product.category, id: { not: product.id } },
    include: publicProductInclude,
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <section className="product-detail section">
        <div className="breadcrumbs"><Link href="/shop">Shop</Link><span>/</span><span>{product.name}</span></div>
        <div className="detail-layout">
          <div className="detail-image" style={{ backgroundImage: `url("${product.image}")` }} role="img" aria-label={product.name} />
          <div className="detail-copy">
            <span className="eyebrow">{product.category} · Naturally good</span>
            <h1>{product.name}<em>.</em></h1>
            <p className="detail-description">{product.description}</p>
            <div className="detail-note"><span>✳</span> Choose the available pack size and quantity below.</div>
            <ProductActions product={serializeCatalogProduct(product)} />
            <p className="delivery-note">Delivery is free and arrives within six calendar days. Pay by M-Pesa, cash or cheque.</p>
          </div>
        </div>
        {product.detailsPublished && (
          <section className="product-facts" aria-labelledby="product-facts-heading">
            <div className="section-heading">
              <div><span className="eyebrow">Product information</span><h2 id="product-facts-heading">The details, <em>clearly.</em></h2></div>
            </div>
            <dl className="product-facts-grid">
              {product.ingredients && <div><dt>Ingredients</dt><dd>{product.ingredients}</dd></div>}
              {product.nutritionInformation && <div><dt>Nutrition information</dt><dd>{product.nutritionInformation}</dd></div>}
              {product.allergenInformation && <div><dt>Allergen information</dt><dd>{product.allergenInformation}</dd></div>}
              {product.storageInstructions && <div><dt>Storage</dt><dd>{product.storageInstructions}</dd></div>}
              {product.countryOfOrigin && <div><dt>Country of origin</dt><dd>{product.countryOfOrigin}</dd></div>}
            </dl>
          </section>
        )}
      </section>
      {related.length > 0 && (
        <section className="section related-section">
          <div className="section-heading"><div><span className="eyebrow">Good company</span><h2>You might also <em>love.</em></h2></div></div>
          <div className="product-grid">
            {expandCatalogVariants(related.map(serializeCatalogProduct)).map(({ product: item, variant }) => (
              <ProductCard key={`${item.id}-${variant.id}`} product={item} variant={variant} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
