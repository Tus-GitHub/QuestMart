"use client";

import {
  PauseIcon,
  PlayIcon,
  CubeTransparentIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import DiscoveryMotion from "./DiscoveryMotion";
import { useUI } from "./UIProvider";

export default function ExperienceSurface({ children, className = "" }) {
  const { motionDisabled } = useUI();
  return (
    <DiscoveryMotion
      paused={motionDisabled}
      className={`commerce-experience ${className}`}
    >
      {children}
    </DiscoveryMotion>
  );
}

export function ExperienceHeader({
  eyebrow,
  title,
  accent,
  description,
  children,
  studio = false,
}) {
  const { motionDisabled, motionReady, reducedMotion, toggleMotion } = useUI();
  return (
    <header
      className={`experience-header ${studio ? "studio-header" : ""}`}
      data-hero-parallax
    >
      <div className="experience-grid" aria-hidden="true" />
      <div className="experience-topline">
        <span className="eyebrow">
          <span className="live-dot" /> {eyebrow}
        </span>
        <button
          className="motion-toggle surface-motion"
          onClick={toggleMotion}
          disabled={!motionReady || reducedMotion}
          aria-pressed={motionDisabled}
          aria-label={
            reducedMotion
              ? "Animations disabled by your reduced-motion preference"
              : motionDisabled
                ? "Resume animations"
                : "Pause animations"
          }
        >
          {motionDisabled ? <PlayIcon /> : <PauseIcon />}
          <span>Motion {motionDisabled ? "off" : "on"}</span>
        </button>
      </div>
      <div className="experience-copy">
        <h1>
          {title}
          <br />
          <em>{accent}</em>
        </h1>
        <p>{description}</p>
        <div className="experience-actions">{children}</div>
      </div>
      <div className="trade-orbit" aria-hidden="true">
        <div className="trade-orbit-ring" />
        <div className="trade-orbit-ring orbit-two" />
        <div className="trade-core">
          <div className="trade-core-face">
            {studio ? <CubeTransparentIcon /> : <ArrowPathIcon />}
            <span>{studio ? "PLAYER / STUDIO" : "PLAY. PASS. REPEAT."}</span>
          </div>
        </div>
        <span className="orbit-satellite satellite-one" />
        <span className="orbit-satellite satellite-two" />
        <span className="orbit-caption">
          {studio
            ? "YOUR COLLECTION. YOUR NEXT CHAPTER."
            : "A NEW PLAYER. ANOTHER ADVENTURE."}
        </span>
      </div>
    </header>
  );
}
