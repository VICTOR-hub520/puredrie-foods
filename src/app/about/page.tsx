import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About Puredrie Foods" };

export default function AboutPage() {
  return (
    <>
      <section className="page-intro about-intro">
        <span className="eyebrow">A little about us</span>
        <h1>Good things,<br /><em>made easy.</em></h1>
        <p>Discover dried fruit and moringa, in packs that fit the way you shop.</p>
        <Link className="button button-dark" href="/shop">Find your favourites <span>↗</span></Link>
      </section>
      <section className="story-band about-story">
        <div className="story-image" role="img" aria-label="A selection of dried fruit and moringa products" />
        <div className="story-copy">
          <span className="eyebrow">The Puredrie approach</span>
          <h2>Choose what you love.<br /><em>We’ll pack it with care.</em></h2>
          <p>Puredrie Foods brings together dried fruit and moringa in one easy place. Whether you are looking for the bright taste of mango, the sweet tang of pineapple, a mix of fruit or moringa, you can explore the range and choose what suits you.</p>
          <p>We make ordering straightforward for individual customers and retailers alike. Pick from the available standard packs, or contact us to discuss a custom quantity that better fits your needs.</p>
          <p>Once you have chosen, we prepare your order to match your selection. Delivery is free, and orders are scheduled within six calendar days, including weekends and public holidays.</p>
          <Link className="underlined-link" href="/contact">Ask us a question <span>↗</span></Link>
        </div>
      </section>
      <section className="about-belief section">
        <div className="about-belief-heading">
          <span className="eyebrow">Why we’re here</span>
          <h2>A better way to choose, order <em>and enjoy.</em></h2>
        </div>
        <div className="about-belief-copy">
          <p>Finding the right product should feel welcoming, not complicated. That is why we bring our range together, show the available pack options, and make it easy to ask about quantities that are not listed.</p>
          <p>From choosing a favourite to getting your order delivered, we want every step to be clear and convenient. Puredrie is here to make it easier to bring dried fruit and moringa into your everyday routine, one order at a time.</p>
        </div>
      </section>
      <section className="about-range section">
        <div className="section-heading">
          <div><span className="eyebrow">A range to explore</span><h2>Find your kind of <em>good.</em></h2></div>
          <Link className="underlined-link" href="/shop">Browse everything <span>↗</span></Link>
        </div>
        <div className="about-range-grid">
          <Link className="about-range-card about-range-mango" href="/shop">
            <span className="about-range-image" role="img" aria-label="Illustration of mango" />
            <span className="about-range-label">Dried mango <i>↗</i></span>
          </Link>
          <Link className="about-range-card about-range-pineapple" href="/shop">
            <span className="about-range-image" role="img" aria-label="Illustration of pineapple" />
            <span className="about-range-label">Dried pineapple <i>↗</i></span>
          </Link>
          <Link className="about-range-card about-range-mixed" href="/shop">
            <span className="about-range-image" role="img" aria-label="Illustration of assorted fruit" />
            <span className="about-range-label">Assorted fruit <i>↗</i></span>
          </Link>
          <Link className="about-range-card about-range-moringa" href="/shop">
            <span className="about-range-image" role="img" aria-label="Illustration of moringa" />
            <span className="about-range-label">Moringa <i>↗</i></span>
          </Link>
        </div>
      </section>
      <section className="about-how section">
        <div className="section-heading">
          <div><span className="eyebrow">Simple from start to finish</span><h2>Goodness, made <em>easy.</em></h2></div>
        </div>
        <div className="values-grid">
          <article><span>STEP 01</span><h2>Explore the range</h2><p>Browse dried mango, pineapple, assorted fruit and moringa in the shop.</p></article>
          <article><span>STEP 02</span><h2>Choose your pack</h2><p>Select a standard pack size, or contact us to discuss a custom quantity.</p></article>
          <article><span>STEP 03</span><h2>We’ll deliver</h2><p>Delivery is free, with orders scheduled within six calendar days.</p></article>
        </div>
      </section>
      <section className="quality-band about-quality">
        <span className="eyebrow">Ready when you are</span>
        <h2>Make your next<br /><em>good choice.</em></h2>
        <p>Browse the range and find a pack that suits you.</p>
        <Link className="button button-light" href="/shop">Shop Puredrie <span>↗</span></Link>
      </section>
    </>
  );
}
