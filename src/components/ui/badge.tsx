import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider", {
  variants: {
    variant: {
      gold: "bg-gold-400/15 text-gold-300 ring-1 ring-inset ring-gold-400/30",
      glass: "bg-noir-950/60 text-jasmine-50 ring-1 ring-inset ring-white/15 backdrop-blur-md",
      rose: "bg-rose-400/15 text-rose-300 ring-1 ring-inset ring-rose-400/30",
      success: "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30",
    },
  },
  defaultVariants: { variant: "gold" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
