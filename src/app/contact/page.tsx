import type { Metadata } from "next";
import ContactContent from "@/app/contact/contact-content";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return <ContactContent />;
}
