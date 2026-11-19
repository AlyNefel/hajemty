import Link from "next/link";
import { CATEGORIES, GOVERNORATES } from "@/data/tunisia";
import { Logo } from "./Navbar";

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-noir-950 pt-20 pb-10">
      <div className="container-lux">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-jasmine-50/60">
              La plateforme de référence pour réserver beauté, bien-être et soins en Tunisie. Des milliers de professionnels, des avis vérifiés,
              une réservation en quelques secondes.
            </p>
            <p className="mt-6 font-arabic text-lg text-gold-300/80" dir="rtl" lang="ar">جمالك، بلمسة واحدة</p>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Catégories</h3>
            <ul className="space-y-2 text-sm text-jasmine-50/65">
              {CATEGORIES.slice(0, 7).map((c) => (
                <li key={c.key}><Link className="hover:text-gold-300" href={`/recherche?category=${c.key}`}>{c.fr}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Villes</h3>
            <ul className="space-y-2 text-sm text-jasmine-50/65">
              {GOVERNORATES.filter((g) => ["tunis", "ariana", "sousse", "sfax", "nabeul", "monastir", "medenine"].includes(g.slug)).map((g) => (
                <li key={g.slug}><Link className="hover:text-gold-300" href={`/institut-beaute/${g.slug}`}>Beauté à {g.name.fr}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Hajemti</h3>
            <ul className="space-y-2 text-sm text-jasmine-50/65">
              <li><Link className="hover:text-gold-300" href="/partenaires">Devenir partenaire</Link></li>
              <li><Link className="hover:text-gold-300" href="/partenaires#tarifs">Tarifs pro</Link></li>
              <li><Link className="hover:text-gold-300" href="/#faq">FAQ</Link></li>
              <li><Link className="hover:text-gold-300" href="/login">Mon compte</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-jasmine-50/45 md:flex-row">
          <p>© {new Date().getFullYear()} Hajemti. Fait avec ♥ à Tunis.</p>
          <p className="flex gap-4"><span>Français</span><span lang="ar">العربية</span><span>English</span></p>
        </div>
      </div>
    </footer>
  );
}
