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
          <span className="eyebrow">A thoughtful kind of simple</span>
          <h2>Good food should fit<br /><em>real life.</em></h2>
          <p>Some days call for a quick bite between errands. Others call for something to share over a cup of tea, a snack to keep at your desk, or a pantry staple you can reach for all week. Puredrie Foods is here for those everyday moments.</p>
          <p>We bring dried mango, pineapple, assorted fruit and moringa together in one place, so it is easier to discover what you enjoy and choose a pack that works for you. No complicated choices—just a considered range, clear pack options and a friendly way to order.</p>
          <p>And if you need a quantity that is not listed, you can get in touch. We are happy to hear what you have in mind and talk through what may work.</p>
          <Link className="underlined-link" href="/contact">Ask us a question <span>↗</span></Link>
        </div>
      </section>
      <section className="about-belief section">
        <div className="about-belief-heading">
          <span className="eyebrow">Our reason for being</span>
          <h2>Make the good choice feel <em>like an easy one.</em></h2>
        </div>
        <div className="about-belief-copy">
          <p>Puredrie Foods is here to make discovering and ordering dried fruit and moringa feel simple, welcoming and personal. We bring mango, pineapple, assorted fruit and moringa together so you can explore the range in one place, compare the available packs and choose what suits your day—whether you are stocking up for home, picking a snack to share, or looking for something different to add to your routine. We know people do not all shop in the same way, so we offer a straightforward online order and a chance to contact us if you need help or have a quantity in mind that is not listed. From your first visit to the moment your order arrives, our aim is to make the choices clear, the next steps easy to understand and the experience pleasant enough that you feel comfortable coming back. That is the kind of everyday service we want Puredrie to be known for.</p>
        </div>
      </section>
      <section className="about-occasion section">
        <div className="about-occasion-photo" role="img" aria-label="Dried fruit ready to share" />
        <div className="about-occasion-copy">
          <span className="eyebrow">For the moments in between</span>
          <h2>A little colour for the <em>everyday.</em></h2>
          <p>Keep a pack nearby for the afternoon lull. Add something fruity to a lunchbox, set out a bowl when friends come over, or make a cup of moringa part of a slower morning. The best routines are often the ones that feel natural—and enjoyable.</p>
          <p>There is no one right way to enjoy our range. Try a single favourite, mix a few together, or pick up something different next time. Make it your own, one simple moment at a time.</p>
          <Link className="underlined-link" href="/shop">Explore the range <span>↗</span></Link>
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
          <div><span className="eyebrow">A promise in the little details</span><h2>What you can expect <em>from us.</em></h2></div>
        </div>
        <div className="values-grid">
          <article><span>01 · CLEAR CHOICES</span><h2>Know what you’re choosing</h2><p>See the products and available pack sizes before you order, so you can select what suits your needs.</p></article>
          <article><span>02 · A HUMAN TOUCH</span><h2>Ask us anything</h2><p>Not sure which pack to choose, or need a different quantity? Get in touch and we’ll talk it through.</p></article>
          <article><span>03 · CAREFUL SERVICE</span><h2>Know what happens next</h2><p>Delivery is free, and orders are scheduled within six calendar days, including weekends and public holidays.</p></article>
        </div>
      </section>
      <section className="about-faq section" aria-labelledby="about-faq-heading">
        <div className="section-heading"><div><span className="eyebrow">A few helpful details</span><h2 id="about-faq-heading">Before you <em>order.</em></h2></div></div>
        <div className="about-faq-list">
          <details><summary>What can I find at Puredrie Foods?</summary><p>Our range includes dried mango, dried pineapple, assorted dried fruit and moringa products. Visit the shop to see current products, pack sizes and prices.</p></details>
          <details><summary>Can I request a quantity that is not listed?</summary><p>Yes. Send us a message with the product and quantity you have in mind. We will get back to you to discuss the request and what is available.</p></details>
          <details><summary>How does delivery work?</summary><p>Delivery is free. Orders are scheduled within six calendar days, including weekends and public holidays. You can confirm your delivery details during checkout.</p></details>
          <details><summary>Do you take orders for shops or larger gatherings?</summary><p>We welcome enquiries from households, retailers and people planning an event. Contact us with the products and quantities you are considering so we can discuss your needs.</p></details>
        </div>
      </section>
      <section className="quality-band about-quality">
        <span className="eyebrow">We’d love to be part of your routine</span>
        <h2>Find a favourite.<br /><em>Make it yours.</em></h2>
        <p>Take a look around, discover something you love, and choose a pack that feels right for you.</p>
        <div className="about-final-actions"><Link className="button button-light" href="/shop">Explore the shop <span>↗</span></Link><Link className="about-contact-link" href="/contact">Or talk to us first</Link></div>
      </section>
    </>
  );
}
