"use client";

/** Tiny fetch wrapper for the wall API: JSON in, `{ ok, data } | { ok: false, status, message }` out. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

export async function wallApi<T>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: j.error?.message ?? "Une erreur est survenue, réessayez." };
    return { ok: true, data: (j.data ?? j) as T };
  } catch {
    return { ok: false, status: 0, message: "Connexion impossible, vérifiez votre réseau." };
  }
}

/** Sends the visitor to sign in, then back to the wall (or the given post). */
export function goSignIn(slug: string, postId?: string) {
  window.location.href = `/login?next=${encodeURIComponent(`/center/${slug}#${postId ? `post-${postId}` : "mur"}`)}`;
}
