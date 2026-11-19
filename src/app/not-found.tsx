import Link from "next/link";
import { Aurora } from "@/components/effects/Aurora";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 text-center">
      <Aurora />
      <div className="relative">
        <p className="font-display text-[clamp(6rem,20vw,12rem)] font-semibold leading-none text-gold-gradient">404</p>
        <h1 className="mt-2 font-display text-3xl">Cette adresse s&apos;est refait une beauté…</h1>
        <p className="mt-2 text-jasmine-50/60">…et a changé de place. Retrouvons votre prochain rendez-vous.</p>
        <Button asChild className="mt-8"><Link href="/">Retour à l&apos;accueil</Link></Button>
      </div>
    </main>
  );
}
