"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/shop", label: "Products" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const activeHref = pathname.startsWith("/shop/") ? "/shop" : pathname;

  return (
    <header className="site-header">
      <div className="announcement">Dried fruit and moringa · Free delivery within six calendar days</div>
      <div className="nav-wrap">
        <Link className="brand" href="/" aria-label="Puredrie Foods home">
          <span className="brand-mark">pf</span>
          <span className="brand-name">puredrie foods<small>naturally delicious · simply better</small></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              aria-current={activeHref === link.href ? "page" : undefined}
              href={link.href}
              key={link.href}
              className={activeHref === link.href ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link className="account-link" href="/account">My account</Link>
          <Link className="cart-link" href="/cart" aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}>
            <span aria-hidden="true">▱</span><span>{hydrated ? count : 0}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
