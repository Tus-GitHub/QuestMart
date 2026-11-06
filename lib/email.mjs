import nodemailer from "nodemailer";
import { emailTemplate } from "./email-templates.mjs";
let transport;
export function emailOrigin() {
  const url = new URL(process.env.APP_ORIGIN || "http://localhost:3011");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("Configure a trusted HTTPS APP_ORIGIN");
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN)
    throw new Error("APP_ORIGIN is required");
  return url.origin;
}
export function emailConfigured() {
  return ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"].every((key) =>
    Boolean(process.env[key]),
  );
}
export function emailTransport() {
  if (!emailConfigured()) throw new Error("Email is not configured");
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    const localDevelopment =
      process.env.NODE_ENV !== "production" &&
      ["127.0.0.1", "localhost"].includes(process.env.SMTP_HOST);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465 && !localDevelopment,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    });
  }
  return transport;
}
export async function sendAccountEmail(kind, user, token) {
  const origin = emailOrigin();
  const url =
    kind === "welcome"
      ? origin
      : `${origin}/${kind === "verify" ? "verify-email" : "reset-password"}#token=${token}`;
  const message = emailTemplate(kind, user.username, url);
  const result = await emailTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: { address: user.email, name: user.username },
    ...message,
  });
  if (!result.accepted?.length) throw new Error("Email was not accepted");
}
