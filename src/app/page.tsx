import Link from "next/link";
import { HeroHeadline } from "@/components/hero-headline";
import { NewsletterForm } from "@/components/newsletter-form";
import { ProductCard } from "@/components/product-card";
import { expandCatalogVariants, publicProductInclude, serializeCatalogProduct } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: publicProductInclude,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
  const featuredProducts = expandCatalogVariants(products.map(serializeCatalogProduct));

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A little goodness, every day</span>
          <HeroHeadline />
          <p>Choose dried mango, pineapple, assorted fruit or moringa in convenient packs. Every order is packed for you, with free delivery within six calendar days.</p>
          <div className="hero-actions">
            <Link className="button button-light" href="/shop">Choose your pack <span>↗</span></Link>
            <Link className="hero-note" href="/about">Get to know us</Link>
          </div>
          <div className="hero-proof" aria-label="Puredrie Foods benefits">
            <span><i>01</i>Dried fruit &amp; moringa</span>
            <span><i>02</i>Packed to order</span>
            <span><i>03</i>Free delivery within six calendar days</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo" role="img" aria-label="Close-up of golden dried mango slices" />
          <span className="hero-caption">Naturally delicious. Ready for your day.</span>
        </div>
      </section>

      <section className="promise-strip" aria-label="Our promises">
        <span>Quality products</span><i>✳</i><span>Packed to order</span><i>✳</i><span>Free delivery</span><i>✳</i><span>Within six days</span>
      </section>

      <section className="flavour-ribbon" aria-label="Explore dried fruit and moringa">
        <p className="visually-hidden">Explore dried mangoes, dried pineapples, assorted dried fruits and moringa products.</p>
        <div className="flavour-ribbon-track" aria-hidden="true">
          <span>MANGO <i>✳</i> PINEAPPLE <i>✳</i> MORINGA <i>✳</i> GOODNESS, YOUR WAY <i>✳</i> </span>
          <span>MANGO <i>✳</i> PINEAPPLE <i>✳</i> MORINGA <i>✳</i> GOODNESS, YOUR WAY <i>✳</i> </span>
        </div>
      </section>

      <section className="section collection-section">
        <div className="section-heading">
          <div><span className="eyebrow">Carefully packed for you</span><h2>Explore our <em>products.</em></h2></div>
          <Link className="underlined-link" href="/shop">View all products <span>↗</span></Link>
        </div>
        {featuredProducts.length ? (
          <div className="product-grid">
            {featuredProducts.map(({ product, variant }) => (
              <ProductCard key={`${product.id}-${variant.id}`} product={product} variant={variant} />
            ))}
          </div>
        ) : (
          <div className="empty-state"><h3>Our next selection is on its way.</h3><p>Check back soon to explore our dried fruit and moringa range.</p></div>
        )}
      </section>

      <section className="story-band">
        <div className="story-image" role="img" aria-label="A selection of Puredrie dried products" />
        <div className="story-copy">
          <span className="eyebrow">About Puredrie Foods</span>
          <h2>Good products.<br /><em>Thoughtfully packed.</em></h2>
          <p>We source processed food products and package them to suit your order. Choose a standard pack or contact us to discuss a custom quantity.</p>
          <p>From individual orders to retail needs, we make it easy to get the products you need.</p>
          <Link className="underlined-link" href="/about">Discover our approach <span>↗</span></Link>
        </div>
      </section>

      <section className="benefits-section section">
        <div className="section-heading"><div><span className="eyebrow">From selection to doorstep</span><h2>Goodness, made <em>simple.</em></h2></div></div>
        <div className="benefits-grid">
          <article><span>01</span><h3>Explore the range</h3><p>Find dried mango, pineapple, assorted fruit and moringa in one easy-to-browse shop.</p></article>
          <article><span>02</span><h3>Choose your pack</h3><p>Pick a listed pack size or contact us to discuss a custom quantity.</p></article>
          <article><span>03</span><h3>Free delivery</h3><p>Every order is scheduled for delivery within six calendar days.</p></article>
        </div>
      </section>

      <section className="custom-order-cta">
        <div><span className="eyebrow">Need a different quantity?</span><h2>Let’s find the right <em>pack for you.</em></h2></div>
        <p>Contact us about custom quantities or retail orders. We’ll help you explore the available options.</p>
        <Link className="button button-light" href="/contact">Talk to our team <span>↗</span></Link>
      </section>

      <section className="closing-cta">
        <span className="eyebrow">A simple way to shop</span>
        <h2>Your order, packed<br /><em>with care.</em></h2>
        <Link className="button button-light" href="/shop">Browse products <span>↗</span></Link>
        <span className="cta-flower" aria-hidden="true">✳</span>
      </section>
      <section className="newsletter-section"><NewsletterForm /></section>
    </>
  );
}
