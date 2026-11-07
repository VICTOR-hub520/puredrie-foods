import type { Metadata } from "next";
import CartContent from "@/app/cart/cart-content";

export const metadata: Metadata = { title: "Shopping bag" };

export default function CartPage() {
  return <CartContent />;
}
