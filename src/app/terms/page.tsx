import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Shopping terms",
  description: "Practical information about orders, prices, payment and delivery at Puredrie Foods.",
};

export default function TermsPage() {
  return <PolicyPage
    eyebrow="Shopping information"
    title="Shopping terms"
    introduction="These notes describe the current online ordering process and should be read alongside the delivery information."
    reviewNotice="The business owner should confirm the registered business details, cancellation arrangements, refund terms and any additional legal terms before treating this page as a complete contract."
    sections={[
      { title: "Products and prices", content: <p>The shop displays current products, pack options and prices in Kenyan shillings. Availability and prices may change. Product information shown is limited to details supplied by the business; contact us if you need information that is not listed.</p> },
      { title: "Placing an order", content: <p>Checkout asks for your contact and delivery details and selected payment method. The system calculates the order total from the product prices on the server and provides an order number after a valid order is recorded. If a custom quantity is requested, it is not part of an order until Puredrie confirms the product, quantity and price with you.</p> },
      { title: "Payment", content: <p>Available checkout methods are M-Pesa, cash, cheque (subject to clearance) and approved customer credit where offered. Selecting a payment method does not mean payment has been received. Payments remain pending until received and recorded; cheques count as received only after clearance. The website does not claim to provide an automated M-Pesa payment confirmation.</p> },
      { title: "Delivery", content: <p>Delivery is free and orders are scheduled within six Nairobi calendar days, including weekends and public holidays. Provide a complete delivery address and town at checkout. If you have a question about whether an address can be served, please contact us before ordering.</p> },
      { title: "Changes or problems", content: <p>If you need to change an order or have an issue, contact Puredrie as soon as possible and include the order number. A request is not confirmed until the business replies. See the <Link href="/delivery-returns">delivery and returns information</Link> for current guidance.</p> },
    ]}
  />;
}
