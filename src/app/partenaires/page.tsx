import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_PRICING_MILLIMES } from "@/lib/plans";
import { formatTND, cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Aurora } from "@/components/effects/Aurora";
import { Stagger, StaggerItem } from "@/components/effects/Reveal";
import { TiltCard } from "@/components/effects/TiltCard";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Devenir partenaire : logiciel de réservation pour salons en Tunisie",
  description: "Agenda en ligne, rappels WhatsApp, mini-site personnalisé et statistiques pour instituts, coiffeurs, barbiers et spas. Gratuit pour commencer.",
};

const PLANS = [
  { key: "FREE", name: "Free", tagline: "Pour démarrer", features: ["Fiche établissement & réservations illimitées", "Agenda jusqu'à 2 collaborateurs", "3 modèles de page + 2 couleurs", "Rappels email", "Statistiques 7 jours"] },
  { key: "PRO", name: "Pro", tagline: "Pour remplir l'agenda", features: ["Tout Free, plus :", "Rappels WhatsApp anti no-show", "8 collaborateurs", "Les 8 modèles premium", "Promotions & stories illimitées", "Acomptes en ligne (Konnect)", "Statistiques 12 mois", "Priorité dans les résultats"] },
  { key: "PREMIUM", name: "Premium", tagline: "Pour une marque d'exception", highlight: true, features: ["Tout Pro, plus :", "Constructeur de site complet", "Vidéo hero, galeries, FAQ, témoignages", "Typographies, animations & thèmes saisonniers", "Sous-domaine + domaine personnalisé", "Mise en avant « Featured »", "Campagnes WhatsApp marketing", "Support prioritaire WhatsApp"] },
  { key: "ENTERPRISE", name: "Enterprise", tagline: "Réseaux & franchises", features: ["Tout Premium, plus :", "Multi-établissements", "Managers multiples & rôles", "Reporting consolidé", "Accès API", "Account manager dédié"] },
] as const;

export default function PartnersPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative overflow-hidden pt-36 pb-20 text-center">
          <Aurora />
          <div className="container-lux relative">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Hajemti pour les pros</p>
            <h1 className="mx-auto max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98]">Le logiciel qui fait <em className="text-gold-shimmer">briller</em> votre salon.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-jasmine-50/65">Inscription en 10 minutes, sans engagement. Les 500 premiers partenaires reçoivent 3 mois de Pro offerts et le badge « Membre fondateur ».</p>
            <div className="mt-8 flex justify-center gap-3"><Button asChild size="lg"><Link href="/login?next=/dashboard">Créer mon espace</Link></Button></div>
          </div>
        </section>

        <section id="tarifs" className="pb-32">
          <div className="container-lux">
            <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((p) => (
                <StaggerItem key={p.key} className="h-full">
                  <TiltCard className="h-full rounded-[28px]" max={4}>
                    <div className={cn("glass relative flex h-full flex-col rounded-[28px] p-7", "highlight" in p && "border-gold-400/50 shadow-glow-gold")}>
                      {"highlight" in p && <span className="absolute -top-3 left-7 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-noir-950">Le plus choisi</span>}
                      <h2 className="font-display text-3xl font-semibold">{p.name}</h2>
                      <p className="text-sm text-jasmine-50/55">{p.tagline}</p>
                      <p className="mt-6 font-display text-5xl font-semibold text-gold-200">
                        {p.key === "FREE" ? "0 DT" : formatTND(PLAN_PRICING_MILLIMES[p.key].month)}
                        <span className="font-sans text-sm font-normal text-jasmine-50/50"> /mois HT</span>
                      </p>
                      <ul className="mt-6 flex-1 space-y-3 text-sm">
                        {p.features.map((f) => <li key={f} className="flex gap-2 text-jasmine-50/80"><Check className="mt-0.5 size-4 shrink-0 text-gold-400" />{f}</li>)}
                      </ul>
                      <Button asChild className="mt-8" variant={"highlight" in p ? "gold" : "glass"}><Link href="/login?next=/dashboard">{p.key === "ENTERPRISE" ? "Nous contacter" : "Commencer"}</Link></Button>
                    </div>
                  </TiltCard>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="mt-6 text-center text-xs text-jasmine-50/45">Annuel : 2 mois offerts. TVA 19 % en sus. Paiement par carte, e-DINAR, Flouci ou D17.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
