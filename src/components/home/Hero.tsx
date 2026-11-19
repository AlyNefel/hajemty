"use client";

import Link from "next/link";
import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { CalendarCheck, Star } from "lucide-react";
import { CATEGORIES } from "@/data/tunisia";
import { Aurora } from "@/components/effects/Aurora";
import { Particles } from "@/components/effects/Particles";
import { SearchBar } from "./SearchBar";

const QUICK = ["hair_salon", "barbershop", "nail_studio", "spa", "hammam", "laser"] as const;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20">
      <Aurora />
      <Particles />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-noir-950)_80%)]" aria-hidden />

      {/* Floating proof cards (parallax) */}
      <m.div style={{ y }} className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden>
        <div className="glass absolute top-[24%] left-[6%] w-60 animate-float rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-gold-400/20"><CalendarCheck className="size-5 text-gold-300" /></div>
            <div><p className="text-sm font-semibold">Réservation confirmée</p><p className="text-xs text-jasmine-50/55">Brushing · Sam. 14:30</p></div>
          </div>
        </div>
        <div className="glass absolute top-[58%] right-[6%] w-64 animate-float rounded-3xl p-4 [animation-delay:-4s]">
          <div className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-4 fill-gold-400 text-gold-400" />)}</div>
          <p className="mt-2 text-sm leading-snug text-jasmine-50/85">« Le meilleur hammam de La Marsa, réservé en 20 secondes. »</p>
          <p className="mt-1 text-xs text-jasmine-50/50">Yasmine · avis vérifié</p>
        </div>
      </m.div>

      <m.div style={{ opacity: fade }} className="container-lux relative z-10 text-center">
        <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/5 px-4 py-1.5 text-xs font-medium tracking-wide text-gold-300">
          <span className="size-1.5 animate-pulse rounded-full bg-gold-400" /> N°1 de la réservation beauté en Tunisie
        </m.p>
        <m.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
          className="mx-auto max-w-5xl font-display text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-tight [text-wrap:balance]">
          Votre beauté, <em className="text-gold-shimmer not-italic md:italic">réservée</em> en un geste.
        </m.h1>
        <m.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }}
          className="mx-auto mt-6 mb-10 max-w-2xl text-base text-jasmine-50/65 md:text-lg [text-wrap:pretty]">
          Instituts, coiffeurs, barbiers, spas et hammams près de chez vous, de Bizerte à Djerba.
          Disponibilités en temps réel, avis vérifiés, confirmation sur WhatsApp.
        </m.p>
        <SearchBar />
        <m.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-8 flex flex-wrap justify-center gap-2">
          {QUICK.map((k) => {
            const c = CATEGORIES.find((x) => x.key === k)!;
            return (
              <li key={k}>
                <Link href={`/recherche?category=${k}`} className="neo inline-block rounded-full px-4 py-2 text-sm text-jasmine-50/75 transition hover:text-gold-300">
                  {c.fr}
                </Link>
              </li>
            );
          })}
        </m.ul>
      </m.div>
    </section>
  );
}
