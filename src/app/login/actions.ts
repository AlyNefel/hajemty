"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { AccountError, registerUser } from "@/lib/users";

export type AuthState = { error?: string; fields?: Record<string, string> };

/** Only same-site relative paths, which prevents open redirects (//evil.com, https://…). */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/compte";
};

async function limited() {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return !rateLimit(ip, "auth").ok;
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (await limited()) return { error: "Trop de tentatives. Réessayez dans une minute." };
  const email = String(form.get("email") ?? "");
  try {
    await signIn("password", { email, password: String(form.get("password") ?? ""), redirectTo: safeNext(form.get("next")) });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "E-mail ou mot de passe incorrect.", fields: { email } };
    throw e; // NEXT_REDIRECT on success
  }
}

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom").max(60),
  email: z.string().trim().email("E-mail invalide").max(120),
  phone: z.string().trim().regex(/^(\+?216)?[\s.]?\d{2}[\s.]?\d{3}[\s.]?\d{3}$/, "Numéro tunisien invalide (8 chiffres)").optional().or(z.literal("")),
  password: z.string().min(8, "8 caractères minimum").max(200),
});

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (await limited()) return { error: "Trop de tentatives. Réessayez dans une minute." };
  const raw = Object.fromEntries(["name", "email", "phone", "password"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = RegisterSchema.safeParse(raw);
  const fields = { name: raw.name, email: raw.email, phone: raw.phone };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  try {
    await registerUser({ ...parsed.data, phone: parsed.data.phone || undefined });
    await signIn("password", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeNext(form.get("next")) });
    return {};
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message, fields };
    if (e instanceof AuthError) return { error: "Compte créé, mais la connexion a échoué. Connectez-vous.", fields };
    throw e;
  }
}

export async function demoLoginAction(form: FormData) {
  await signIn("demo", { redirectTo: safeNext(form.get("next")) });
}

export async function oauthAction(form: FormData) {
  const provider = String(form.get("provider") ?? "");
  if (!["google", "facebook", "apple"].includes(provider)) return;
  await signIn(provider, { redirectTo: safeNext(form.get("next")) });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
