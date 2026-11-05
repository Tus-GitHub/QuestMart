export const PLATFORMS = Object.freeze([
  "PS4", "PS5", "Xbox One", "Xbox Series X", "Nintendo Switch", "PC",
]);
export const FORMATS = Object.freeze(["disc", "cartridge"]);
export const CONDITIONS = Object.freeze(["like-new", "good", "fair"]);
export const LISTING_STATUSES = Object.freeze(["available", "reserved", "sold", "removed"]);
export const MIN_PRICE_PAISE = 100;
export const MAX_PRICE_PAISE = 10_000_000;
export const MAX_PHOTOS = 5;

export function isPhotoUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Used by future create/edit endpoints before inserting values into PostgreSQL.
// Identity, currency, availability, and order state always come from the server.
export function validateListingInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, errors: { form: "Provide a listing object." } };
  }

  const errors = {};
  const data = {};
  for (const [field, min, max] of [["title", 2, 120], ["description", 20, 3000]]) {
    const value = typeof input[field] === "string" ? input[field].trim() : "";
    if (value.length < min || value.length > max) {
      errors[field] = `${field === "title" ? "Title" : "Description"} must be ${min}–${max} characters.`;
    } else {
      data[field] = value;
    }
  }

  for (const [field, allowed] of [["platform", PLATFORMS], ["format", FORMATS], ["condition", CONDITIONS]]) {
    if (!allowed.includes(input[field])) errors[field] = `Choose a valid ${field}.`;
    else data[field] = input[field];
  }

  if (!Number.isSafeInteger(input.pricePaise) || input.pricePaise < MIN_PRICE_PAISE || input.pricePaise > MAX_PRICE_PAISE) {
    errors.pricePaise = "Price must be between ₹1 and ₹100,000, expressed in whole paise.";
  } else {
    data.pricePaise = input.pricePaise;
  }

  if (!Array.isArray(input.photos) || input.photos.length < 1 || input.photos.length > MAX_PHOTOS || !input.photos.every(isPhotoUrl)) {
    errors.photos = `Add 1–${MAX_PHOTOS} valid HTTPS photo URLs without embedded credentials.`;
  } else {
    data.photos = [...input.photos];
  }

  if (input.rawgId !== undefined && input.rawgId !== null) {
    if (!Number.isSafeInteger(input.rawgId) || input.rawgId < 1) errors.rawgId = "RAWG ID must be a positive integer.";
    else data.rawgId = input.rawgId;
  }

  return Object.keys(errors).length ? { success: false, errors } : { success: true, data };
}
