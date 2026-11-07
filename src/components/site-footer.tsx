import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PublicAppearanceControls } from "@/components/public-appearance-controls";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Link className="brand footer-brand" href="/">
            <span className="brand-mark">pf</span>
            <span className="brand-name">puredrie foods<small>naturally delicious · simply better</small></span>
          </Link>
          <p>Quality dried fruits and natural products, carefully packaged for everyday life.</p>
        </div>
        <div className="footer-links">
          <span className="eyebrow">Explore</span>
          <Link href="/shop">Products</Link>
          <Link href="/about">About us</Link>
          <Link href="/contact">Contact & enquiries</Link>
          <Link href="/admin/login">Staff sign in</Link>
        </div>
        <div className="footer-links">
          <span className="eyebrow">Say hello</span>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          {BRAND.phones.map((phone) => <a href={`tel:${phone.international}`} key={phone.local}>{phone.display}</a>)}
        </div>
        <div className="footer-links">
          <span className="eyebrow">Appearance</span>
          <PublicAppearanceControls />
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Puredrie Foods. All rights reserved.</span>
        <span>Naturally delicious. Simply better.</span>
      </div>
    </footer>
  );
}
