export const clamp01 = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

// A reversible timeline shared by the camera, chapter controls and story copy.
export function sampleJourney(value) {
  const progress = clamp01(value);
  const segment = Math.min(2, Math.floor(progress * 3));
  const phase = progress === 1 ? 1 : progress * 3 - segment;
  const blend = segment < 2 ? smooth((phase - 0.76) / 0.24) : 0;
  const chapter = blend >= 0.5 ? segment + 1 : segment;
  const beat = chapter === segment && phase >= 0.4 ? 1 : 0;
  return { progress, segment, phase, blend, chapter, beat };
}
export function chapterPosition(index) {
  return Math.max(0, Math.min(2, Math.trunc(index) || 0)) / 3;
}
export function renderScale(width, height, deviceScale = 1, compact = false) {
  const pixels = Math.max(1, width * height);
  return Math.min(
    Math.max(1, deviceScale),
    compact ? 1 : 1.35,
    Math.sqrt((compact ? 850000 : 1800000) / pixels),
  );
}
