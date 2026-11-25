"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Store } from "lucide-react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wall } from "./Wall";
import type { WallCenter } from "./PostCard";

type Tab = "profil" | "mur";

/**
 * "Profil" (services, team, reviews, hours) and "Mur" (the salon's posts). Deep links: #mur opens the
 * wall, #post-<id> opens it on that post. The profile stays in the HTML for SEO; the wall loads on demand.
 */
export function CenterTabs({ profile, center, postCount }: { profile: React.ReactNode; center: WallCenter; postCount: number }) {
  const [tab, setTab] = useState<Tab>("profil");
  const [focusPostId, setFocusPostId] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash;
      if (h === "#mur") setTab("mur");
      else if (h.startsWith("#post-")) { setTab("mur"); setFocusPostId(h.slice(6)); }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const select = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", t === "mur" ? "#mur" : window.location.pathname + window.location.search);
    document.getElementById("onglets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs: { key: Tab; label: string; icon: typeof Store; badge?: number }[] = [
    { key: "profil", label: "Profil", icon: Store },
    { key: "mur", label: "Mur", icon: LayoutGrid, badge: postCount },
  ];

  return (
    <div>
      <div id="onglets" className="sticky top-0 z-30 -mx-4 mb-8 scroll-mt-0 border-b border-current/10 bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Sections du salon" className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`}
              onClick={() => select(key)}
              className={cn("relative flex h-14 items-center gap-2 px-4 text-sm font-semibold transition sm:px-5", tab === key ? "text-[var(--c-text)]" : "text-[var(--c-muted)] hover:text-[var(--c-text)]")}>
              <Icon className="size-4" /> {label}
              {!!badge && <span className="rounded-full bg-current/10 px-1.5 py-px text-[11px] tabular-nums">{badge}</span>}
              {tab === key && <m.span layoutId="center-tab" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--c-primary)]" />}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id="panel-profil" aria-labelledby="tab-profil" hidden={tab !== "profil"}>{profile}</div>
      <div role="tabpanel" id="panel-mur" aria-labelledby="tab-mur" hidden={tab !== "mur"} className="mx-auto max-w-2xl">
        <Wall center={center} active={tab === "mur"} focusPostId={focusPostId} />
      </div>
    </div>
  );
}
