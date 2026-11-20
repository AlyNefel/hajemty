import { cn } from "@/lib/utils";

/** Pure-CSS aurora: blurred gradient blobs animated on transform only (compositor-friendly, zero JS). */
export function Aurora({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} style={{ opacity: intensity }}>
      <div className="absolute -top-1/3 left-[-10%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--aurora-1),transparent_60%)] blur-3xl animate-aurora" />
      <div className="absolute top-[10%] right-[-20%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--aurora-2),transparent_60%)] blur-3xl animate-aurora [animation-delay:-8s] [animation-duration:34s]" />
      <div className="absolute bottom-[-30%] left-[20%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--aurora-3),transparent_60%)] blur-3xl animate-aurora [animation-delay:-16s] [animation-duration:40s]" />
    </div>
  );
}
