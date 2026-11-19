import { cn } from "@/lib/utils";
import { Reveal } from "@/components/effects/Reveal";

export function SectionHeading({ eyebrow, title, lede, align = "left", className }: {
  eyebrow: string; title: React.ReactNode; lede?: string; align?: "left" | "center"; className?: string;
}) {
  return (
    <Reveal className={cn("mb-10 md:mb-14", align === "center" && "mx-auto max-w-2xl text-center", className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">{eyebrow}</p>
      <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.05] text-jasmine-50">{title}</h2>
      {lede && <p className={cn("mt-4 max-w-xl text-base leading-relaxed text-jasmine-50/65 [text-wrap:pretty]", align === "center" && "mx-auto")}>{lede}</p>}
    </Reveal>
  );
}
