"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowDownIcon,
  ArrowUpRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { catalog } from "@/data/catalog.mjs";
import ShowroomCanvas from "./ShowroomCanvas";
import { MotionToggle } from "./ExperienceSurface";
import { useUI } from "./UIProvider";

const worlds = catalog
  .slice(0, 3)
  .map((game) => ({ src: game.cover || game.image, title: game.name }));
export default function MarketplaceWorld({ covered }) {
  const host = useRef(null),
    engine = useRef(null);
  const { motionDisabled } = useUI();
  useEffect(() => {
    const element = host.current;
    let frame = 0, disposed = false;
    const update = () => {
      frame = 0;
      if (disposed || !element.isConnected || motionDisabled || covered) return;
      const box = element.getBoundingClientRect();
      engine.current?.setProgress(
        Math.max(0, Math.min(1, -box.top / box.height)),
      );
    };
    const request = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", request, { passive: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
    };
  }, [motionDisabled, covered]);
  return (
    <header ref={host} className="market-world">
      <div className="market-world-fallback" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>Q↗</span>
      </div>
      <ShowroomCanvas
        mode="market"
        images={worlds}
        color="#bcf091"
        controller={engine}
        covered={covered}
      />
      <div className="market-world-shade" aria-hidden="true" />
      <div className="market-world-top page-width">
        <span className="eyebrow">
          <i /> THE PLAYER EXCHANGE
        </span>
        <MotionToggle />
      </div>
      <div className="market-world-copy page-width">
        <span className="market-world-kicker">
          ONE PLAYER’S FINALE. YOUR OPENING SCENE.
        </span>
        <h1>
          <span>Great games.</span>
          <em>Next players.</em>
        </h1>
        <p>
          Worlds worth passing on. Find a physical copy from another player and
          make the next chapter yours.
        </p>
        <div className="experience-actions">
          <a href="#market-inventory" className="button primary">
            Enter the exchange <ArrowDownIcon />
          </a>
          <Link href="/sell" className="market-world-sell">
            List your game <PlusIcon />
          </Link>
        </div>
      </div>
      <div className="market-world-bottom page-width">
        <span>PLAY. PASS. REPEAT.</span>
        <Link href="/#discover">
          Explore new games <ArrowUpRightIcon />
        </Link>
        <span>
          SCROLL TO THE TRADING FLOOR <ArrowDownIcon />
        </span>
      </div>
    </header>
  );
}
