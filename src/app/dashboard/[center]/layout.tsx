import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, isDemo, listMyCenters } from "@/lib/dashboard/repo";
import { Logo } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
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

  const items: NavKey[] = ["overview", "calendar"];
  if (can(actor, "service.manage", { centerId: center.id })) items.push("services");
  if (can(actor, "employee.manage", { centerId: center.id })) items.push("staff");

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
        <SideNav slug={center.slug} items={items} />
        {isDemo() && <DemoNote className="mt-auto" />}
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-noir-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <p className="truncate font-display text-xl font-semibold">{center.name}</p>
          <div className="w-40 shrink-0"><CenterSwitcher current={center.slug} centers={centers} /></div>
        </header>
        {isDemo() && <DemoNote className="mx-4 mt-4 lg:hidden" />}
        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
      <BottomNav slug={center.slug} items={items} />
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
