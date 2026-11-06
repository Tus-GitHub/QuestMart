"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from "@heroicons/react/24/outline";
import ShowroomCanvas from "./ShowroomCanvas";
import GameCase from "./GameCase";
import Media from "./Media";
import { useUI } from "./UIProvider";

export default function GameInspection({
  game,
  photos,
  title,
  leaving = false,
}) {
  const engine = useRef(null);
  const { motionDisabled } = useUI();
  const [ready, setReady] = useState(false),
    [selected, setSelected] = useState(0);
  const [orbit, setOrbit] = useState(true),
    [zoom, setZoom] = useState(false),
    [side, setSide] = useState("Front cover");
  const images = useMemo(
    () =>
      photos
        ? photos.map((src) => ({ src }))
        : [{ src: game.cover || game.image }],
    [photos, game],
  );
  const active = ready && !motionDisabled;
  useEffect(() => {
    if (photos) engine.current?.select(selected);
  }, [selected, ready, photos]);
  useEffect(() => {
    engine.current?.setOrbit(orbit);
  }, [orbit, ready]);
  useEffect(() => {
    engine.current?.setZoom(zoom);
  }, [zoom, ready]);
  const name = title || game.name;
  return (
    <div className="inspection" data-active={active}>
      <div
        className="inspection-stage"
        role="group"
        aria-label={
          photos
            ? `${name} seller photo viewer`
            : `${name} interactive game case`
        }
      >
        <div className="inspection-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="inspection-fallback">
          {photos ? (
            <Media
              src={photos[selected]}
              alt={`${name}, seller photo ${selected + 1}`}
              sizes="(max-width: 700px) 90vw, 600px"
              priority
            />
          ) : (
            <GameCase game={game} interactive />
          )}
        </div>
        <ShowroomCanvas
          mode={photos ? "photos" : "case"}
          images={images}
          title={name}
          color={game?.color || "#bbeb9d"}
          controller={engine}
          covered={leaving}
          onSide={setSide}
          onReadyChange={setReady}
        />
        <span className="inspection-stage-label">
          {photos ? "THE ACTUAL COPY" : "THE COLLECTION / ROTATE TO DISCOVER"}
        </span>
      </div>
      {photos ? (
        <div
          className="inspection-gallery"
          role="group"
          aria-label="Seller photos"
        >
          {photos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              aria-label={`View seller photo ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <Media src={photo} alt="" sizes="64px" />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      ) : null}
      {active ? (
        <div className="inspection-controls">
          <div className="inspection-hint">
            <span>{photos ? "DRAG TO LOOK AROUND" : "DRAG TO ROTATE"}</span>
            <output aria-live="polite">
              {photos ? `Photo ${selected + 1} of ${photos.length}` : side}
            </output>
          </div>
          <div className="inspection-buttons">
            {!photos ? (
              <button
                className="icon-button"
                aria-label="Rotate game case left"
                onClick={() => engine.current?.rotate(-Math.PI / 3)}
              >
                <ChevronLeftIcon />
              </button>
            ) : null}
            <button
              className="icon-button"
              aria-label="Reset inspection view"
              onClick={() => {
                engine.current?.reset();
                setZoom(false);
              }}
            >
              <ArrowPathIcon />
            </button>
            {!photos ? (
              <button
                className="icon-button"
                aria-label="Rotate game case right"
                onClick={() => engine.current?.rotate(Math.PI / 3)}
              >
                <ChevronRightIcon />
              </button>
            ) : null}
            <span />
            <button
              className="icon-button"
              aria-label={zoom ? "Zoom out" : "Zoom in"}
              aria-pressed={zoom}
              onClick={() => setZoom((v) => !v)}
            >
              {zoom ? (
                <MagnifyingGlassMinusIcon />
              ) : (
                <MagnifyingGlassPlusIcon />
              )}
            </button>
            <button
              className="icon-button"
              aria-label={
                orbit ? "Pause display movement" : "Resume display movement"
              }
              aria-pressed={!orbit}
              onClick={() => setOrbit((v) => !v)}
            >
              {orbit ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
        </div>
      ) : null}
      <p className="inspection-note">
        {photos
          ? "Seller-provided photos. Check every angle before you buy."
          : "Interactive artwork display. Check the store for the available edition."}
      </p>
    </div>
  );
}
