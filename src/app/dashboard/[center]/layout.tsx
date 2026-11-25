import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Palette } from "lucide-react";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, isDemo, listMyCenters } from "@/lib/dashboard/repo";
import { listCenterReviews } from "@/lib/reviews/repo";
import { Logo } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { BottomNav, CenterSwitcher, SideNav, type NavKey } from "@/components/dashboard/DashNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace pro", robots: { index: false, follow: false } };

const ROLE_LABEL = { OWNER: "Propriétaire", MANAGER: "Manager", EMPLOYEE: "Collaborateur", SUPER_ADMIN: "Super admin" } as const;

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = await dashboardActor();
  if (!actor) redirect(`/login?next=/dashboard/${slug}`);
  const [center, centers] = await Promise.all([getDashCenter(slug, actor), listMyCenters(actor)]);
  if (!center) notFound();

  const ok = (p: Parameters<typeof can>[1]) => can(actor, p, { centerId: center.id });
  const items: NavKey[] = ["overview", "calendar"];
  if (ok("review.reply")) items.push("reviews");
  if (ok("analytics.read")) items.push("clients");
  if (ok("post.manage")) items.push("mur");
  if (ok("service.manage")) items.push("services");
  if (ok("employee.manage")) items.push("staff");
  if (ok("center.update")) items.push("settings");
  // Badge: reviews waiting for a reply.
  const badges = ok("review.reply") ? { reviews: (await listCenterReviews(center.id, { filter: "unreplied", limit: 1 })).total } : {};

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-white/10 bg-noir-900/60 p-5 lg:flex">
        <Logo />
        <div className="space-y-2">
          <p className="truncate font-display text-xl font-semibold">{center.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="gold">{center.plan}</Badge>
            <Badge variant="glass">{ROLE_LABEL[center.myRole]}</Badge>
          </div>
          <CenterSwitcher current={center.slug} centers={centers} />
        </div>
        <SideNav slug={center.slug} items={items} badges={badges} />
        <div className="mt-auto space-y-3">
          {actor.role === "SUPER_ADMIN" && (
            <Link href="/admin/apparence" className="flex items-center gap-3 rounded-xl border border-gold-400/25 bg-gold-400/5 px-3 py-2.5 text-sm text-gold-200 transition hover:bg-gold-400/10">
              <Palette className="size-4.5" /> <span className="flex-1">Apparence du site</span>
              <span className="rounded-full bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">Admin</span>
            </Link>
          )}
          <ThemeSwitcher variant="full" label="Thème" />
          {isDemo() && <DemoNote />}
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-noir-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <p className="truncate font-display text-xl font-semibold">{center.name}</p>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher />
            {actor.role === "SUPER_ADMIN" && (
              <Link href="/admin/apparence" aria-label="Apparence du site (admin)" className="grid size-9 place-items-center rounded-full bg-gold-400/10 text-gold-200"><Palette className="size-4" /></Link>
            )}
            <div className="w-36"><CenterSwitcher current={center.slug} centers={centers} /></div>
          </div>
        </header>
        {isDemo() && <DemoNote className="mx-4 mt-4 lg:hidden" />}
        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
      <BottomNav slug={center.slug} items={items} badges={badges} />
    </div>
  );
}

function DemoNote({ className }: { className?: string }) {
  return (
    <p className={`flex gap-2 rounded-xl border border-gold-400/20 bg-gold-400/5 p-3 text-xs leading-relaxed text-gold-200/80 ${className ?? ""}`}>
      <FlaskConical className="size-4 shrink-0" />
      <span>Mode démo : données fictives. Vos modifications sont gardées en mémoire jusqu&apos;au redémarrage du serveur.</span>
    </p>
  );
}
