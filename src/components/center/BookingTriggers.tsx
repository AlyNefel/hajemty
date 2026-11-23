"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Event the booking widget listens to: pre-selects a service when a row on the page is tapped. */
export const PICK_SERVICE_EVENT = "hajemti:pick-service";

const goToBooking = (serviceId?: string) => {
  if (serviceId) window.dispatchEvent(new CustomEvent(PICK_SERVICE_EVENT, { detail: serviceId }));
  document.getElementById("reserver")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/** A service row that opens the booking form with this service selected (plain #reserver link without JS). */
export function ServiceRow({ serviceId, children, className }: { serviceId: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#reserver"
      onClick={(e) => { e.preventDefault(); goToBooking(serviceId); }}
      className={cn("group flex items-center justify-between gap-4 p-4 transition hover:bg-[color-mix(in_srgb,var(--c-text)_4%,transparent)]", className)}
    >
      {children}
      <ChevronRight className="-ms-2 size-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" aria-hidden />
    </a>
  );
}

/**
 * Phones and tablets: the booking form sits at the end of the page, so keep a "Réserver" bar fixed at
 * the bottom until the form itself is on screen. Hidden from lg up, where the form is a sticky sidebar.
 */
export function MobileBookBar({ priceLabel }: { priceLabel: string }) {
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const form = document.getElementById("reserver");
    if (!form) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-current/10 bg-[color-mix(in_srgb,var(--c-bg)_88%,transparent)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-300 lg:hidden",
        formVisible && "translate-y-full",
      )}
      aria-hidden={formVisible}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="text-sm text-[var(--c-muted)]">dès <strong className="text-base text-[var(--c-text)]">{priceLabel}</strong></p>
        <button type="button" tabIndex={formVisible ? -1 : 0} onClick={() => goToBooking()} className="site-btn h-12 flex-1 px-6 text-sm font-semibold sm:flex-none">
          Réserver un créneau
        </button>
      </div>
    </div>
  );
}
