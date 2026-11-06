import { query, withTransaction } from "./db.mjs";
import { createAccountEmail } from "./account-email.mjs";
import { sendAccountEmail } from "./email.mjs";
export const accountEmail = createAccountEmail(
  { query, withTransaction },
  sendAccountEmail,
);
