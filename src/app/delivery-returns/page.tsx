import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Delivery and returns",
  description: "Current delivery timing and guidance for questions about a Puredrie Foods order.",
};

export default function DeliveryReturnsPage() {
  return <PolicyPage
    eyebrow="Getting your order"
    title="Delivery and returns"
    introduction="Here is what we can confirm about delivery and what to do if you have a concern about an order."
    reviewNotice="The business owner still needs to confirm service areas, delivery-provider arrangements, return eligibility and deadlines, refunds, and replacement terms. These details are not invented here."
    sections={[
      { title: "Delivery timing", content: <p>Delivery is free. Orders are scheduled within six Nairobi calendar days from the order date, including weekends and public holidays. The date shown at checkout is calculated using the Africa/Nairobi business timezone. Please provide your town, full address and a reachable phone number.</p> },
      { title: "Delivery questions", content: <p>If you need to clarify an address or delivery detail, contact us as soon as you can and include your order number. The business will confirm any change directly with you.</p> },
      { title: "If something is not right", content: <p>Contact us promptly with your order number and a description of the concern. Please wait for instructions before sending any product back. Puredrie has not yet published a fixed return window, refund schedule or replacement guarantee; the business will discuss available next steps with you.</p> },
      { title: "Contact", content: <p>Email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> or visit our <Link href="/contact">contact page</Link> to call or message us.</p> },
    ]}
  />;
}
