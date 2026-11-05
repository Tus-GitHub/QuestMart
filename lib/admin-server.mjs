import { query, withTransaction } from "./db.mjs";
import { createAdminService } from "./admin.mjs";
export const adminService = createAdminService({ query, withTransaction });
