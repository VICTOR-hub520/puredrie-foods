import type { ReactNode } from "react";

type PolicySection = { title: string; content: ReactNode };

export function PolicyPage({
  eyebrow,
  title,
  introduction,
  reviewNotice,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  reviewNotice?: string;
  sections: PolicySection[];
}) {
  return (
    <article className="policy-page section">
      <header className="policy-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{introduction}</p>
      </header>
      {reviewNotice && <aside className="policy-review-note"><strong>Business review needed</strong><p>{reviewNotice}</p></aside>}
      <div className="policy-sections">
        {sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.content}</section>)}
      </div>
    </article>
  );
}
