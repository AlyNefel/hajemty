import type { Metadata } from "next";
import { signIn } from "@/auth";
import { authConfig } from "@/auth.config";
import { Aurora } from "@/components/effects/Aurora";
import { Logo } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

const LABELS: Record<string, string> = { google: "Continuer avec Google", facebook: "Continuer avec Facebook", apple: "Continuer avec Apple" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/"; // no open redirects
  const providers = authConfig.providers.map((p) => (typeof p === "function" ? p({}) : p)).map((p) => ({ id: p.id, name: p.name }));

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[32px] p-8 text-center md:p-10">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-8 font-display text-4xl font-semibold">Bienvenue</h1>
        <p className="mt-2 text-sm text-jasmine-50/60">Connectez-vous pour réserver, suivre vos rendez-vous et cumuler vos points.</p>
        <div className="mt-8 space-y-3">
          {providers.length ? providers.map((p) => (
            <form key={p.id} action={async () => { "use server"; await signIn(p.id, { redirectTo }); }}>
              <Button type="submit" variant="glass" size="lg" className="w-full">{LABELS[p.id] ?? p.name}</Button>
            </form>
          )) : (
            <p className="rounded-2xl border border-gold-400/25 bg-gold-400/5 p-4 text-sm text-gold-200">
              Aucun fournisseur configuré. Renseignez <code>AUTH_GOOGLE_ID</code> / <code>AUTH_FACEBOOK_ID</code> / <code>AUTH_APPLE_ID</code> dans <code>.env.local</code>.
            </p>
          )}
        </div>
        <p className="mt-8 text-xs text-jasmine-50/40">En continuant, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité de Hajemti.</p>
      </div>
    </main>
  );
}
