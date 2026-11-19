"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Centered modal on desktop, bottom sheet on mobile. Focus trap, Esc to close and aria come from Radix. */
export function DialogContent({ title, description, children, className }: {
  title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fade-in_.2s_ease-out]" />
      <D.Content
        className={cn(
          "fixed z-[61] flex max-h-[92dvh] flex-col border border-white/10 bg-noir-900 shadow-2xl focus:outline-none",
          "inset-x-0 bottom-0 rounded-t-[28px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]",
          "data-[state=open]:animate-[sheet-in_.3s_cubic-bezier(.22,1,.36,1)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 pt-6 pb-4">
          <div>
            <D.Title className="font-display text-2xl font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-jasmine-50/55">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="grid size-9 shrink-0 place-items-center rounded-full text-jasmine-50/60 transition hover:bg-white/5 hover:text-jasmine-50 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none" aria-label="Fermer">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
