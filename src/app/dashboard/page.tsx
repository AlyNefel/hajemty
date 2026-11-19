import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardActor, listMyCenters } from "@/lib/dashboard/repo";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace pro", robots: { index: false } };

/** Entry point: send the viewer to their (first) center's dashboard. */
export default async function DashboardIndex() {
  const actor = await dashboardActor();
  if (!actor) redirect("/login?next=/dashboard");
  const centers = await listMyCenters(actor);
  if (centers.length) redirect(`/dashboard/${centers[0].slug}`);

  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-4xl">Aucun établissement</h1>
        <p className="mt-2 text-jasmine-50/60">Créez votre établissement pour accéder à votre espace pro.</p>
        <Button asChild className="mt-6"><Link href="/partenaires">Inscrire mon établissement</Link></Button>
      </div>
    </main>
  );
}
