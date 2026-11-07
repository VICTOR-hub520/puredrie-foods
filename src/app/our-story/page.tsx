import type { Metadata } from "next";
import Link from "next/link";
import { getBrandContent } from "@/lib/brand-content";

export const metadata: Metadata = {
  title: "Our story",
  description: "The love of fruit and the idea of everyday convenience behind Puredrie Foods.",
};

export default async function OurStoryPage() {
  const content = (await getBrandContent()).filter((item) => item.isPublished);
  return (
    <>
      <section className="page-intro about-intro">
        <span className="eyebrow">The idea behind Puredrie</span>
        <h1>A love of fruit.<br /><em>A simpler way to enjoy it.</em></h1>
        <p>Our story starts with an appreciation for fruit and a wish to make it more convenient to enjoy.</p>
      </section>
      <section className="story-narrative section">
        {content.filter((item) => ["story", "inspiration", "mission", "vision", "philosophy", "commitment", "founder-message", "quality"].includes(item.key)).map((item) => (
          <article className={item.key === "founder-message" ? "story-founder-note" : ""} key={item.key}>
            <span className="eyebrow">{item.key === "founder-message" ? "A personal note" : item.key.replaceAll("-", " ")}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
        <Link className="button button-dark" href="/shop">Explore the products <span>↗</span></Link>
      </section>
    </>
  );
}
