"use client";

import { useEffect, useRef } from "react";

type Props = { count?: number; color?: string; className?: string };

/**
 * Golden "jasmine dust": a lightweight canvas particle field. It is DPR-aware, pauses when off-screen
 * or the tab is hidden, and is disabled for reduced motion, Save-Data, or low-memory devices.
 */
export function Particles({ count = 55, color, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || nav.connection?.saveData || (nav.deviceMemory ?? 8) < 3) return;

    // Color follows the active platform theme (--particle-rgb) unless one is forced via props.
    const readRgb = () => color ?? (getComputedStyle(document.documentElement).getPropertyValue("--particle-rgb").trim() || "229,192,123");
    let rgb = readRgb();
    const themeObserver = new MutationObserver(() => { rgb = readRgb(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ps = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.00012, vy: -Math.random() * 0.00025 - 0.00005, a: Math.random() * 0.6 + 0.2, t: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tick = () => {
      if (!visible || document.hidden) { raf = requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx * 16; p.y += p.vy * 16; p.t += 0.02;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02 || p.x > 1.02) p.x = Math.random();
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.t));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${rgb},0.8)`;
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); themeObserver.disconnect(); window.removeEventListener("resize", resize); };
  }, [count, color]);

  return <canvas ref={ref} aria-hidden className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
