"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import type { CenterCardView } from "@/lib/repositories/centers";
import { CenterCard } from "@/components/marketplace/CenterCard";
import { Stagger, StaggerItem } from "@/components/effects/Reveal";
import { Button } from "@/components/ui/button";

/** Server-rendered with Tunis defaults, then re-sorted by real distance once the user shares their location. */
export function NearbyCenters({ initial }: { initial: CenterCardView[] }) {
  const [centers, setCenters] = useState(initial);
  const [state, setState] = useState<"idle" | "locating" | "located" | "denied">("idle");

  const locate = () => {
    setState("locating");
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        const res = await fetch(`/api/centers?lat=${coords.latitude.toFixed(4)}&lng=${coords.longitude.toFixed(4)}&sort=distance&limit=8`);
        if (res.ok) setCenters((await res.json()).data);
        setState("located");
      },
      () => setState("denied"),
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  return (
    <>
      <div className="-mt-6 mb-8 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={locate} disabled={state === "locating"}>
          <LocateFixed className="size-4" /> {state === "located" ? "Position mise à jour" : state === "locating" ? "Localisation…" : "Utiliser ma position"}
        </Button>
        {state === "denied" && <p className="text-sm text-jasmine-50/55">Localisation refusée. Choisissez une ville dans la recherche.</p>}
      </div>
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {centers.slice(0, 8).map((c) => (
          <StaggerItem key={c.id}><CenterCard c={c} /></StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
