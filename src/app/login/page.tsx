import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasDatabase } from "@/lib/db";
import { getUserById } from "@/lib/users";
import { LoginForm } from "@/components/auth/AuthForms";
import { AuthShell, oauthProviders, safeNext } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  // Only skip the form for a live account: a token whose user is gone (demo store reset, deleted
  // account) must land on the form, or /login and /compte bounce between each other forever.
  const id = (await auth())?.user?.id;
  if (id && (await getUserById(id))) redirect(next);
  return (
    <AuthShell title="Bienvenue" lede="Connectez-vous pour réserver, suivre vos rendez-vous, laisser des avis et cumuler vos points.">
      <LoginForm next={next} providers={oauthProviders()} demo={!hasDatabase()} />
    </AuthShell>
  );
}
