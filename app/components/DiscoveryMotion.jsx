"use client";
import { useEffect, useRef } from "react";

// Event delegation keeps motion working when catalog pages change. Only the
// active card gets compositor promotion; pointer updates never rerender React.
export default function DiscoveryMotion({
  children,
  paused = false,
  className = "",
}) {
  const root = useRef(null);
  useEffect(() => {
    const element = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let observer, frame, activeCard, activeHero, cardBox, heroBox;
    const cardProperties = [
      "--tilt-x",
      "--tilt-y",
      "--pointer-x",
      "--pointer-y",
      "--light-x",
      "--light-y",
    ];
    const heroProperties = [
      "--hero-move-x",
      "--hero-move-y",
      "--hero-light-x",
      "--hero-light-y",
    ];
    function resetCard() {
      activeCard?.classList.remove("is-tilting");
      cardProperties.forEach((property) =>
        activeCard?.style.removeProperty(property),
      );
      activeCard = cardBox = null;
    }
    function resetHero() {
      activeHero?.classList.remove("is-tracking");
      heroProperties.forEach((property) =>
        activeHero?.style.removeProperty(property),
      );
      activeHero = heroBox = null;
    }
    function leave() {
      cancelAnimationFrame(frame);
      resetCard();
      resetHero();
    }
    function move(event) {
      if (
        paused ||
        preference.matches ||
        !pointer.matches ||
        event.pointerType !== "mouse"
      )
        return;
      const card = event.target.closest("[data-tilt]");
      const hero = event.target.closest("[data-hero-parallax]");
      cancelAnimationFrame(frame);
      if (activeCard !== card) {
        resetCard();
        activeCard = card;
        cardBox = card?.getBoundingClientRect();
      }
      if (activeHero !== hero) {
        resetHero();
        activeHero = hero;
        heroBox = hero?.getBoundingClientRect();
      }
      const { clientX, clientY } = event;
      const clamp = (value) => Math.max(0, Math.min(1, value));
      frame = requestAnimationFrame(() => {
        if (card?.isConnected && cardBox) {
          const x = clamp((clientX - cardBox.left) / cardBox.width);
          const y = clamp((clientY - cardBox.top) / cardBox.height);
          card.classList.add("is-tilting");
          card.style.setProperty("--tilt-x", `${(0.5 - y) * 18}deg`);
          card.style.setProperty("--tilt-y", `${(x - 0.5) * 18}deg`);
          card.style.setProperty("--pointer-x", (x - 0.5) * 2);
          card.style.setProperty("--pointer-y", (y - 0.5) * 2);
          card.style.setProperty("--light-x", `${x * 100}%`);
          card.style.setProperty("--light-y", `${y * 100}%`);
        }
        if (hero?.isConnected && heroBox) {
          const x = clamp((clientX - heroBox.left) / heroBox.width);
          const y = clamp((clientY - heroBox.top) / heroBox.height);
          hero.classList.add("is-tracking");
          hero.style.setProperty("--hero-move-x", `${(0.5 - x) * 26}px`);
          hero.style.setProperty("--hero-move-y", `${(0.5 - y) * 20}px`);
          hero.style.setProperty("--hero-light-x", `${x * 100}%`);
          hero.style.setProperty("--hero-light-y", `${y * 100}%`);
        }
      });
    }
    function configure() {
      observer?.disconnect();
      leave();
      const sections = element.querySelectorAll("[data-reveal]");
      sections.forEach((section) => section.classList.remove("await-reveal"));
      if (paused || preference.matches) return;
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
    pointer.addEventListener("change", leave);
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", leave, { passive: true });
    window.addEventListener("resize", leave);
    window.addEventListener("blur", leave);
    return () => {
      observer?.disconnect();
      leave();
      preference.removeEventListener("change", configure);
      pointer.removeEventListener("change", leave);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", leave);
      window.removeEventListener("resize", leave);
      window.removeEventListener("blur", leave);
    };
  }, [paused]);
  return (
    <div
      ref={root}
      className={`discovery-experience ${className}${paused ? " motion-paused" : ""}`}
    >
      {children}
    </div>
  );
}
