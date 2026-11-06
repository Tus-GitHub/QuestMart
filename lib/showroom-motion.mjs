export function fitPhoto(width, height, maxWidth = 4.2, maxHeight = 3.2) {
  const ratio = Math.max(1, width) / Math.max(1, height);
  const w = Math.min(maxWidth, maxHeight * ratio);
  return [w, w / ratio];
}

export function caseSide(angle) {
  const degrees = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
  return degrees > 105 && degrees < 255
    ? "Back of case"
    : degrees > 65 && degrees < 295
      ? "Case spine"
      : "Front cover";
}

export function releaseVelocity(delta, milliseconds) {
  // A fast flick has momentum, while a delayed pointer-up must not restart it.
  return milliseconds > 100
    ? 0
    : Math.max(-0.035, Math.min(0.035, delta / Math.max(8, milliseconds)));
}
