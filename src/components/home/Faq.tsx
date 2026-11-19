"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { FAQ_ITEMS } from "@/data/faq";


export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="mx-auto max-w-3xl space-y-3">
      {FAQ_ITEMS.map((f, i) => (
        <Accordion.Item key={i} value={`i${i}`} className="glass overflow-hidden rounded-2xl">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium transition hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
              {f.q}
              <Plus className="size-5 shrink-0 text-gold-400 transition-transform duration-300 group-data-[state=open]:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden px-6 text-sm leading-relaxed text-jasmine-50/65 data-[state=closed]:animate-none data-[state=open]:pb-5">
            {f.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
