import test from "node:test";
import assert from "node:assert/strict";
import { validateListingInput } from "../lib/listing-validation.mjs";

const listingInput = () => ({
  title: "GTA V", platform: "PS4", format: "disc", condition: "good",
  pricePaise: 80000, description: "Used disc in good condition, with its original case.",
  photos: ["https://images.example.com/gta-v.jpg"],
});

test("listing validation normalizes input and drops client ownership/state fields", () => {
  const input = { ...listingInput(), title: " GTA V ", seller: "attacker", status: "sold", currency: "USD", rawgId: 3498 };
  const result = validateListingInput(input);
  assert.equal(result.success, true);
  assert.equal(result.data.title, "GTA V");
  assert.equal(result.data.rawgId, 3498);
  for (const field of ["seller", "status", "currency"]) assert.equal(field in result.data, false);
  result.data.photos.push("https://images.example.com/other.jpg");
  assert.equal(input.photos.length, 1);
});

test("listing validation rejects malformed objects, coerced money and invalid enums", () => {
  for (const value of [null, [], "listing", 1]) assert.equal(validateListingInput(value).success, false);
  for (const pricePaise of ["80000", 1.5, 0, -100, 10_000_001, NaN, Infinity]) {
    assert.ok(validateListingInput({ ...listingInput(), pricePaise }).errors.pricePaise);
  }
  for (const [field, value] of [["title", {}], ["description", "short"], ["platform", "unknown"], ["format", "download"], ["condition", "new"], ["rawgId", "3498"]]) {
    assert.ok(validateListingInput({ ...listingInput(), [field]: value }).errors[field]);
  }
});

test("listing validation rejects unsafe and oversized photo sets", () => {
  for (const photos of [[], new Array(6).fill("https://example.com/a.jpg"), ["http://example.com/a.jpg"], ["javascript:alert(1)"], ["https://user:pass@example.com/a.jpg"], [{}], ["https://example.com/" + "x".repeat(2048)]]) {
    assert.ok(validateListingInput({ ...listingInput(), photos }).errors.photos);
  }
});
