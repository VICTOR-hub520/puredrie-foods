import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about Puredrie products, ordering, payment and delivery.",
};

const questions = [
  ["What products are available?", "The current shop includes dried mangoes, dried pineapples, assorted dried fruits, moringa powder and moringa teabags. Current availability, pack sizes and prices are shown on the shop page."],
  ["Can I request a quantity that is not listed?", "Yes. Contact us with the product and quantity you have in mind. We will discuss what may be available; a custom request is not confirmed until we agree the details and price with you."],
  ["How much is delivery and when should I expect my order?", "Delivery is free. Orders are scheduled within six Nairobi calendar days of the order date, including weekends and public holidays. We collect your town and delivery address at checkout."],
  ["Which payment methods can I choose?", "Checkout currently offers M-Pesa, cash, cheque (subject to clearance), and approved customer credit when available. Choosing a method does not itself confirm payment: payments remain pending until received and recorded."],
  ["Where can I find ingredient or nutrition information?", "The shop shows the product information currently supplied by the business. Contact us before ordering if you need ingredient, allergen or nutrition details that are not listed. We do not make unsupported health claims."],
  ["What should I do if there is a problem with my order?", "Please contact us with your order number and a description of the issue. Our published return and refund arrangements are still being confirmed; do not send a product back before we have discussed next steps with you."],
];

export default function FAQPage() {
  return (
    <section className="policy-page section">
      <header className="policy-heading"><span className="eyebrow">Helpful details</span><h1>Frequently asked questions</h1><p>A few answers to help you choose, place and receive an order.</p></header>
      <div className="about-faq-list">
        {questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      </div>
      <p className="policy-contact">Still have a question? <Link href="/contact">Get in touch with us.</Link></p>
    </section>
  );
}
