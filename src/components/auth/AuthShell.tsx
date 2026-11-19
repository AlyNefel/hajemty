import { authConfig } from "@/auth.config";
import { Aurora } from "@/components/effects/Aurora";
import { Logo } from "@/components/layout/Navbar";

export const oauthProviders = () => authConfig.providers.map((p) => (typeof p === "function" ? p({}) : p)).map((p) => ({ id: p.id }));
export const safeNext = (n?: string) => (n?.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/compte");

export function AuthShell({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[32px] p-7 text-center md:p-10">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-7 font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-2 mb-7 text-sm text-jasmine-50/60">{lede}</p>
        {children}
        <p className="mt-8 text-xs text-jasmine-50/40">En continuant, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité de Hajemti.</p>
      </div>
    </main>
  );
}
