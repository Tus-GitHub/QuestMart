export async function api(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const error = new Error(
      data?.message || "Something went wrong. Please try again.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
export function money(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}
export function readable(value) {
  return (value || "")
    .replaceAll("-", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
