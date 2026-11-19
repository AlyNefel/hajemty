"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedCounter({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString("fr-FR") + suffix),
    });
    return () => controls.stop();
  }, [inView, to, suffix, duration]);

  return <span ref={ref}>{to.toLocaleString("fr-FR") + suffix}</span>;
}
