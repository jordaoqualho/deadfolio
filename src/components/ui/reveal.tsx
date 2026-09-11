"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JavaScript; only offscreen sections are queued. */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || motion.matches || !("IntersectionObserver" in window))
      return;

    const show = () => element.removeAttribute("data-reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -32px 0px" },
    );

    if (element.getBoundingClientRect().top >= window.innerHeight) {
      element.setAttribute("data-reveal-pending", "");
      observer.observe(element);
    }
    const onMotionChange = () => {
      if (motion.matches) {
        show();
        observer.disconnect();
      }
    };
    motion.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      show();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="reveal"
      onFocusCapture={() => ref.current?.removeAttribute("data-reveal-pending")}
    >
      {children}
    </div>
  );
}
