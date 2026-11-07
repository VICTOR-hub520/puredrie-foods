import type { Metadata } from "next";
import CheckoutContent from "@/app/checkout/checkout-content";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutContent />;
}
