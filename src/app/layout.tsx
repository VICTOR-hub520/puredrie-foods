import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { SiteChrome } from "@/components/site-chrome";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Puredrie Foods — Naturally Delicious. Simply Better.",
    template: "%s | Puredrie Foods",
  },
  description:
    "Discover quality dried fruits and natural products carefully packaged to bring convenience, flavour and goodness to your everyday life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ThemeProvider>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
