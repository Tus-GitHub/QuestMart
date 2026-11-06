import { ApiError } from "./http.mjs";

function text(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, `${label} is invalid.`);
  }
  return value.trim();
}

function password(value, signup) {
  if (
    typeof value !== "string" ||
    value.length < (signup ? 8 : 1) ||
    Buffer.byteLength(value, "utf8") > 72
  ) {
    throw new ApiError(
      400,
      signup
        ? "Password must be at least 8 characters and at most 72 UTF-8 bytes."
        : "Password is invalid.",
    );
  }
  return value;
}

export function validateSignup(data) {
  const username = text(data.username, "Username", 30);
  if (!/^[A-Za-z0-9_-]{3,30}$/.test(username)) {
    throw new ApiError(
      400,
      "Username must be 3–30 letters, numbers, underscores, or hyphens.",
    );
  }
  const email = text(data.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[,;<>()[\]"\\]/.test(email))
    throw new ApiError(400, "Email is invalid.");
  return {
    username: username.toLowerCase(),
    email,
    password: password(data.password, true),
  };
}

export function validateSignin(data) {
  return {
    identifier: text(data.identifier, "Username or email", 254),
    password: password(data.password, false),
  };
}
