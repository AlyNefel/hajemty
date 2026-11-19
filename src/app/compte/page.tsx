import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCustomerBookings } from "@/lib/customer";
import { getUserById } from "@/lib/users";
import { logoutAction } from "@/app/login/actions";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { MyBookings } from "@/components/account/MyBookings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user?.id ? await getUserById(session.user.id) : null;
  if (!user) redirect("/login?next=/compte");
  const { bookings, loyalty } = await listCustomerBookings(user);
  const now = new Date().toISOString();
  const upcoming = bookings.filter((b) => b.end >= now && (b.status === "pending" || b.status === "confirmed" || b.status === "checked_in")).reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));
  const toReview = past.filter((b) => b.canReview).length;

  return (
    <>
      <Navbar />
      <main className="container-lux pt-28 pb-24">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-jasmine-50/50">Mon compte</p>
            <h1 className="font-display text-4xl font-semibold md:text-5xl">Bonjour {user.name.split(" ")[0]} ✨</h1>
            <p className="mt-1 text-sm text-jasmine-50/50">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="glass"><Link href="/recherche">Nouvelle réservation</Link></Button>
            <form action={logoutAction}><Button type="submit" variant="ghost">Déconnexion</Button></form>
          </div>
        </header>

        <section aria-label="Fidélité" className="glass relative mt-8 overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="absolute -top-20 -right-20 size-64 rounded-full opacity-20 blur-3xl" style={{ background: loyalty.tier.color }} />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Hajemti Rewards</p>
              <p className="mt-2 font-display text-5xl font-semibold tabular-nums">{loyalty.points.toLocaleString("fr-FR")} <span className="text-2xl text-jasmine-50/60">points</span></p>
              <p className="mt-1 text-sm">Niveau <strong style={{ color: loyalty.tier.color }}>{loyalty.tier.tier}</strong></p>
            </div>
            {loyalty.next && (
              <div className="w-full max-w-sm">
                <p className="mb-2 text-sm text-jasmine-50/60">Encore <strong className="text-jasmine-50">{loyalty.next.missing.toLocaleString("fr-FR")} pts</strong> pour {loyalty.next.tier}</p>
                <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(loyalty.next.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${Math.max(4, loyalty.next.progress * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-jasmine-50/45">1 point par dinar dépensé · +50 points par avis vérifié</p>
              </div>
            )}
          </div>
        </section>

        {toReview > 0 && (
          <p className="mt-6 rounded-2xl border border-gold-400/30 bg-gold-400/5 px-5 py-4 text-sm text-gold-200">
            ⭐ {toReview} visite{toReview > 1 ? "s attendent" : " attend"} votre avis : gagnez 50 points par avis.
          </p>
        )}

        <MyBookings upcoming={upcoming} past={past} />
      </main>
      <Footer />
    </>
  );
}
