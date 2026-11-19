"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/** LazyMotion + domAnimation keeps Framer Motion at ~15KB. `reducedMotion="user"` honors OS settings. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
