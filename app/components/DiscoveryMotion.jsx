"use client";
import { useEffect, useRef } from "react";

// One observer and one pointer listener for the whole discovery surface.
export default function DiscoveryMotion({ children }) {
  const root = useRef(null);
  useEffect(() => {
    const element = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer;
    let frame;
    let active;
    function reset() {
      if (active) {
        active.style.removeProperty("--tilt-x");
        active.style.removeProperty("--tilt-y");
        active = null;
      }
    }
    function move(event) {
      if (preference.matches || event.pointerType !== "mouse") return;
      const card = event.target.closest("[data-tilt]");
      cancelAnimationFrame(frame);
      if (active !== card) reset();
      if (!card) return;
      active = card;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect();
        const x = (clientX - box.left) / box.width;
        const y = (clientY - box.top) / box.height;
        card.style.setProperty("--tilt-x", `${(0.5 - y) * 7}deg`);
        card.style.setProperty("--tilt-y", `${(x - 0.5) * 7}deg`);
        card.style.setProperty("--light-x", `${x * 100}%`);
        card.style.setProperty("--light-y", `${y * 100}%`);
      });
    }
    function leave() {
      cancelAnimationFrame(frame);
      reset();
    }
    function configure() {
      observer?.disconnect();
      leave();
      const sections = element.querySelectorAll("[data-reveal]");
      sections.forEach((section) => section.classList.remove("await-reveal"));
      if (preference.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.remove("await-reveal");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08 },
      );
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top > window.innerHeight) {
          section.classList.add("await-reveal");
          observer.observe(section);
        }
      });
    }
    configure();
    preference.addEventListener("change", configure);
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", leave);
    return () => {
      observer?.disconnect();
      leave();
      preference.removeEventListener("change", configure);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div ref={root} className="discovery-experience">
      {children}
    </div>
  );
}
