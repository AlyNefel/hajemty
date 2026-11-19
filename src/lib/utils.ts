import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 45000 millimes → "45 DT" ; 42500 → "42,500 DT" */
export function formatTND(millimes: number): string {
  const dt = millimes / 1000;
  const hasMillimes = millimes % 1000 !== 0;
  return `${dt.toLocaleString("fr-TN", { minimumFractionDigits: hasMillimes ? 3 : 0, maximumFractionDigits: 3 })} DT`;
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const TIMEZONE = "Africa/Tunis";
