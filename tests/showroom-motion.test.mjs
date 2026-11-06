import test from "node:test";
import assert from "node:assert/strict";
import {
  fitPhoto,
  caseSide,
  releaseVelocity,
} from "../lib/showroom-motion.mjs";

test("seller photos fit within the display without cropping or stretching", () => {
  for (const [width, height] of [
    [1920, 1080],
    [1080, 1920],
    [500, 500],
    [4000, 500],
  ]) {
    const [w, h] = fitPhoto(width, height);
    assert.ok(w <= 4.2 && h <= 3.200001);
    assert.ok(Math.abs(w / h - width / height) < 0.00001);
    assert.ok(Math.abs(w - 4.2) < 0.00001 || Math.abs(h - 3.2) < 0.00001);
  }
});
test("case descriptions remain correct after full rotations in either direction", () => {
  for (const turns of [-10, -1, 0, 1, 10]) {
    const base = turns * Math.PI * 2;
    assert.equal(caseSide(base), "Front cover");
    assert.equal(caseSide(base + Math.PI / 2), "Case spine");
    assert.equal(caseSide(base + Math.PI), "Back of case");
  }
});
test("drag momentum is bounded and does not restart after a held gesture", () => {
  assert.equal(releaseVelocity(40, 1), 0.035);
  assert.equal(releaseVelocity(-40, 1), -0.035);
  assert.equal(releaseVelocity(1, 300), 0);
  assert.equal(releaseVelocity(0, 0), 0);
});
