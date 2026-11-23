import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasDatabase } from "@/lib/db";
import { getUserById } from "@/lib/users";
import { RegisterForm } from "@/components/auth/AuthForms";
import { AuthShell, oauthProviders, safeNext } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  // Only skip the form for a live account: a token whose user is gone (demo store reset, deleted
  // account) must land on the form, or /login and /compte bounce between each other forever.
  const id = (await auth())?.user?.id;
  if (id && (await getUserById(id))) redirect(next);
  return (
    <AuthShell title="Créer un compte" lede="Gratuit. Réservez en quelques secondes et gagnez des points à chaque visite.">
      <RegisterForm next={next} providers={oauthProviders()} demo={!hasDatabase()} />
    </AuthShell>
  );
}
