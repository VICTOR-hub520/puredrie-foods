import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy information",
  description: "How Puredrie Foods uses information submitted through this shop and customer account.",
};

export default function PrivacyPage() {
  return <PolicyPage
    eyebrow="Your information"
    title="Privacy information"
    introduction="This page describes the information the Puredrie Foods website currently asks for and how it is used to run the shop."
    reviewNotice="Before launch, the business should review this notice against its legal identity, data-retention periods, service providers and applicable Kenyan privacy requirements."
    sections={[
      { title: "Information you provide", content: <p>When you create an account or place an order, we collect details such as your name, email address, phone number and delivery address. Contact messages and newsletter sign-ups also include the details you submit. Order records include the products, quantities, totals, chosen payment method and order status. Where a payment is recorded, the business may also record its amount, date and reference; this checkout does not collect card numbers or process an online card payment.</p> },
      { title: "How information is used", content: <p>Information is used to respond to enquiries, manage customer accounts, prepare and deliver orders, record payments and provide order history or status updates. Administrator accounts can access business records to perform those tasks.</p> },
      { title: "Browser storage and sessions", content: <p>The website uses browser storage for the shopping cart and appearance preferences. Sign-in uses an HttpOnly session cookie so the site can maintain your account session. Clearing browser storage may remove a locally saved cart or appearance preference.</p> },
      { title: "Order and account access", content: <p>Customer accounts are protected by a password and session. Account pages show the signed-in customer’s order information. For questions about information associated with you, contact us using the details below and include enough information for us to identify your request safely.</p> },
      { title: "Retention and sharing", content: <p>Order and payment records are retained in the business database. The exact retention period and the business’s arrangements with delivery or technology providers have not yet been published; please contact us if you need clarification before placing an order.</p> },
      { title: "Contact", content: <p>For privacy questions or requests, email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> or use the <Link href="/contact">contact page</Link>.</p> },
    ]}
  />;
}
