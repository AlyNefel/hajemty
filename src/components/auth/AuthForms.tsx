"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { demoLoginAction, loginAction, oauthAction, registerAction, type AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

const LABELS: Record<string, string> = { google: "Continuer avec Google", facebook: "Continuer avec Facebook", apple: "Continuer avec Apple" };

function Submit({ children, variant = "gold" }: { children: React.ReactNode; variant?: "gold" | "glass" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" variant={variant} className="w-full" disabled={pending}>{pending ? "Un instant…" : children}</Button>;
}

function Alternatives({ next, providers, demo }: { next: string; providers: { id: string }[]; demo: boolean }) {
  if (!providers.length && !demo) return null;
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-jasmine-50/40"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>
      <div className="space-y-2.5">
        {demo && (
          <form action={demoLoginAction}>
            <input type="hidden" name="next" value={next} />
            <Submit variant="glass">✨ Essayer avec le compte client démo</Submit>
          </form>
        )}
        {providers.map((p) => (
          <form key={p.id} action={oauthAction}>
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="provider" value={p.id} />
            <Submit variant="glass">{LABELS[p.id] ?? p.id}</Submit>
          </form>
        ))}
      </div>
    </>
  );
}

export function LoginForm({ next, providers, demo }: { next: string; providers: { id: string }[]; demo: boolean }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, {});
  return (
    <>
      <form action={action} className="space-y-4 text-left">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail"><Input name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></Field>
        <Field label="Mot de passe"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <FormError message={state.error} />
        <Submit>Se connecter</Submit>
      </form>
      <p className="mt-4 text-sm text-jasmine-50/60">
        Pas encore de compte ? <Link className="font-semibold text-gold-300 hover:underline" href={`/inscription?next=${encodeURIComponent(next)}`}>Créer un compte</Link>
      </p>
      <Alternatives next={next} providers={providers} demo={demo} />
    </>
  );
}

export function RegisterForm({ next, providers, demo }: { next: string; providers: { id: string }[]; demo: boolean }) {
  const [state, action] = useActionState<AuthState, FormData>(registerAction, {});
  return (
    <>
      <form action={action} className="space-y-4 text-left">
        <input type="hidden" name="next" value={next} />
        <Field label="Nom complet"><Input name="name" autoComplete="name" required minLength={2} maxLength={60} defaultValue={state.fields?.name} /></Field>
        <Field label="E-mail"><Input name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></Field>
        <Field label="Téléphone (optionnel)" hint="Pour recevoir vos confirmations sur WhatsApp">
          <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+216 20 123 456" defaultValue={state.fields?.phone} />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum"><Input name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>
        <FormError message={state.error} />
        <Submit>Créer mon compte</Submit>
      </form>
      <p className="mt-4 text-sm text-jasmine-50/60">
        Déjà inscrit·e ? <Link className="font-semibold text-gold-300 hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>Se connecter</Link>
      </p>
      <Alternatives next={next} providers={providers} demo={demo} />
    </>
  );
}
