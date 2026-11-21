import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-jasmine-50 placeholder:text-jasmine-50/35 transition focus:border-gold-400/60 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-gold-400/20 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(control, className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-20 resize-y", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(control, "cursor-pointer [&>option]:bg-noir-900", className)} {...p} />
));
Select.displayName = "Select";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-jasmine-50/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-jasmine-50/40">{hint}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none",
        checked ? "bg-gold-400" : "bg-white/15")}
    >
      <span className={cn("inline-block size-5 rounded-full bg-[#fff] shadow transition", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300">{message}</p>;
}
