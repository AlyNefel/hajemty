"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/recherche", label: "Explorer" },
  { href: "/recherche?category=spa", label: "Spas & Hammams" },
  { href: "/recherche?category=barbershop", label: "Barbiers" },
  { href: "/#fidelite", label: "Fidélité" },
  { href: "/partenaires", label: "Espace pro" },
];

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="Hajemti, accueil">
      <span className="relative grid size-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-noir-950 shadow-glow-gold">
        <span className="font-display text-xl font-bold italic leading-none">h</span>
      </span>
      <span className="font-display text-2xl font-semibold tracking-wide">
        Hajemti<span className="text-gold-400">.</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", scrolled ? "py-2" : "py-4")}>
      <div className="container-lux">
        <nav className={cn("flex items-center justify-between rounded-full px-4 py-2 transition-all duration-500 md:px-6", scrolled && "glass")}>
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-4 py-2 text-sm text-jasmine-50/75 transition hover:bg-white/5 hover:text-jasmine-50">{l.label}</Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">Connexion</Link></Button>
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/recherche">Réserver</Link></Button>
            <Button variant="glass" size="icon" className="lg:hidden" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <m.ul initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              className="glass mt-2 grid gap-1 rounded-3xl p-3 lg:hidden">
              {LINKS.map((l) => (
                <li key={l.href}><Link onClick={() => setOpen(false)} href={l.href} className="block rounded-2xl px-4 py-3 text-jasmine-50/85 hover:bg-white/5">{l.label}</Link></li>
              ))}
              <li className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="glass"><Link href="/login">Connexion</Link></Button>
                <Button asChild><Link href="/recherche">Réserver</Link></Button>
              </li>
            </m.ul>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
