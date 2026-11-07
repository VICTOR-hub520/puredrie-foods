import type { Metadata } from "next";
import Link from "next/link";
import { getBrandContent } from "@/lib/brand-content";

export const metadata: Metadata = {
  title: "About Puredrie Foods",
  description: "Discover the inspiration, mission and customer-first approach behind Puredrie Foods.",
};

export default async function AboutPage() {
  const content = await getBrandContent();
  const published = content.filter((item) => item.isPublished);
  const story = published.find((item) => item.key === "story");
  const inspiration = published.find((item) => item.key === "inspiration");
  const mission = published.find((item) => item.key === "mission");
  const vision = published.find((item) => item.key === "vision");
  const philosophy = published.find((item) => item.key === "philosophy");
  const commitment = published.find((item) => item.key === "commitment");
  const founder = published.find((item) => item.key === "founder-message");
  const quality = published.find((item) => item.key === "quality");

  return (
    <>
      <section className="page-intro about-intro">
        <span className="eyebrow">A little about us</span>
        <h1>Enjoy the<br /><em>goodness of nature.</em></h1>
        <p>Fruit, convenience and a little care—this is the thinking behind Puredrie Foods.</p>
        <Link className="button button-dark" href="/shop">Explore our range <span>↗</span></Link>
      </section>

      {story && (
        <section className="story-band about-story">
          <div className="story-image" role="img" aria-label="A selection of dried fruit and moringa products" />
          <div className="story-copy">
            <span className="eyebrow">Our story</span>
            <h2>{story.title}</h2>
            <p>{story.body}</p>
            {inspiration && <><h3>{inspiration.title}</h3><p>{inspiration.body}</p></>}
            <Link className="underlined-link" href="/our-story">Read our story <span>↗</span></Link>
          </div>
        </section>
      )}

      {(mission || vision) && (
        <section className="about-belief section">
          <div className="about-belief-heading">
            <span className="eyebrow">What guides us</span>
            <h2>Our purpose, <em>in our own words.</em></h2>
          </div>
          <div className="about-belief-copy">
            {mission && <div className="brand-value"><h3>{mission.title}</h3><p>{mission.body}</p></div>}
            {vision && <div className="brand-value"><h3>{vision.title}</h3><p>{vision.body}</p></div>}
          </div>
        </section>
      )}

      {(philosophy || commitment || quality || founder) && (
        <section className="about-principles section">
          <div className="section-heading">
            <div><span className="eyebrow">The way we do things</span><h2>Our approach, <em>day to day.</em></h2></div>
          </div>
          <div className="about-principles-list">
            {[philosophy, commitment, quality, founder].filter((item) => item !== undefined).map((item) => (
              <article key={item.key}>
                <span className="eyebrow">{item.key === "founder-message" ? "A personal note" : item.key.replaceAll("-", " ")}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="about-range section">
        <div className="section-heading">
          <div><span className="eyebrow">A range to explore</span><h2>Find your kind of <em>good.</em></h2></div>
          <Link className="underlined-link" href="/shop">Browse everything <span>↗</span></Link>
        </div>
        <div className="about-range-grid">
          <Link className="about-range-card about-range-mango" href="/shop"><span className="about-range-image" role="img" aria-label="Illustration of mango" /><span className="about-range-label">Dried mango <i>↗</i></span></Link>
          <Link className="about-range-card about-range-pineapple" href="/shop"><span className="about-range-image" role="img" aria-label="Illustration of pineapple" /><span className="about-range-label">Dried pineapple <i>↗</i></span></Link>
          <Link className="about-range-card about-range-mixed" href="/shop"><span className="about-range-image" role="img" aria-label="Illustration of assorted fruit" /><span className="about-range-label">Assorted fruit <i>↗</i></span></Link>
          <Link className="about-range-card about-range-moringa" href="/shop"><span className="about-range-image" role="img" aria-label="Illustration of moringa" /><span className="about-range-label">Moringa <i>↗</i></span></Link>
        </div>
      </section>

      <section className="about-quality quality-band">
        <span className="eyebrow">A good place to begin</span>
        <h2>Find a favourite.<br /><em>Make it yours.</em></h2>
        <p>Take a look around and choose a pack that feels right for you.</p>
        <div className="about-final-actions"><Link className="button button-light" href="/shop">Explore the shop <span>↗</span></Link><Link className="about-contact-link" href="/contact">Or talk to us first</Link></div>
      </section>
    </>
  );
}
