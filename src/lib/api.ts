import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError } from "./rbac";

export const apiError = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json({ error: { code, message, details } }, { status });

/** Uniform error mapping for route handlers. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError) return apiError(400, "VALIDATION", "Invalid input", e.flatten());
      if (e instanceof ForbiddenError) return apiError(403, "FORBIDDEN", e.message);
      if (e instanceof Error && "code" in e && "status" in e && typeof (e as { status: unknown }).status === "number") {
        const be = e as Error & { code: string; status: number };
        return apiError(be.status, be.code, be.message);
      }
      console.error(e);
      return apiError(500, "INTERNAL", "Something went wrong");
    }
  };
}
