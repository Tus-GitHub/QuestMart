import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleJourney,
  chapterPosition,
  renderScale,
} from "../lib/journey.mjs";

test("chapter controls reach each world's opening story beat", () => {
  for (let chapter = 0; chapter < 3; chapter++) {
    const state = sampleJourney(chapterPosition(chapter));
    assert.equal(state.chapter, chapter);
    assert.equal(state.beat, 0);
    assert.equal(state.blend, 0);
  }
});
test("forward and reverse scroll cross boundaries without flashing the old chapter", () => {
  for (const boundary of [1 / 3, 2 / 3]) {
    const before = sampleJourney(boundary - 0.000001),
      after = sampleJourney(boundary + 0.000001);
    assert.equal(before.chapter, after.chapter);
    assert.equal(before.beat, 0);
    assert.equal(after.beat, 0);
    assert.ok(before.blend > 0.999);
    assert.equal(after.blend, 0);
  }
  for (let i = 0; i <= 1000; i++) {
    const value = i / 1000,
      forward = sampleJourney(value),
      reverse = sampleJourney(1 - (1 - value));
    assert.equal(forward.chapter, reverse.chapter);
    assert.ok(forward.segment >= 0 && forward.segment <= 2);
  }
});
test("overscroll and invalid input stay within the story, including the final beat", () => {
  assert.equal(sampleJourney(-1).progress, 0);
  assert.equal(sampleJourney(NaN).chapter, 0);
  assert.deepEqual(sampleJourney(2), {
    progress: 1,
    segment: 2,
    phase: 1,
    blend: 0,
    chapter: 2,
    beat: 1,
  });
  assert.equal(sampleJourney(0.18).beat, 1);
});
test("render resolution stays within mobile and desktop pixel budgets", () => {
  for (const [width, height, compact] of [
    [390, 844, true],
    [768, 1024, true],
    [3840, 2160, false],
  ]) {
    const ratio = renderScale(width, height, 3, compact);
    assert.ok(width * height * ratio * ratio <= (compact ? 850001 : 1800001));
    assert.ok(ratio <= (compact ? 1 : 1.35));
  }
});
