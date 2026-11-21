import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { dashboardActor } from "@/lib/dashboard/repo";
import { can } from "@/lib/rbac";
import { Logo } from "@/components/layout/Navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false, follow: false } };

/** Super-admin area. Middleware gates /admin by JWT role; this re-checks server-side (defense in depth). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await dashboardActor();
  if (!actor) redirect("/login?next=/admin/apparence");
  if (!can(actor, "admin.appearance")) notFound();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-noir-950/85 backdrop-blur-xl">
        <div className="container-lux flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden items-center gap-1.5 rounded-full bg-gold-400/12 px-3 py-1 text-xs font-semibold text-gold-200 ring-1 ring-inset ring-gold-400/25 sm:inline-flex">
              <ShieldCheck className="size-3.5" /> Super administrateur
            </span>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-jasmine-50/70 transition hover:bg-white/5 hover:text-jasmine-50">
            <ArrowLeft className="size-4" /> Espace pro
          </Link>
        </div>
      </header>
      <main className="container-lux py-8 pb-32 md:py-12">{children}</main>
    </div>
  );
}
