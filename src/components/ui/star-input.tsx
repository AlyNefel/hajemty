"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["", "Très décevant", "Décevant", "Correct", "Très bien", "Exceptionnel"];

/** Accessible 1–5 star picker: a radio group with arrow-key support and hover preview. */
export function StarInput({ value, onChange, size = 36 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div role="radiogroup" aria-label="Note" className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} étoile${n > 1 ? "s" : ""} : ${LABELS[n]}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
            }}
            className="rounded-md p-0.5 transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
          >
            <Star style={{ width: size, height: size }} strokeWidth={1.4}
              className={cn("transition", n <= shown ? "scale-105 fill-gold-400 text-gold-400" : "text-white/25")} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm text-gold-200" aria-live="polite">{LABELS[shown]}</p>
    </div>
  );
}
