import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth.mjs";
import AdminConsole from "./AdminConsole";
import AdminAccess from "./AdminAccess";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin control room",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  try {
    const incoming = await headers();
    const user = await requireAdmin(
      new Request("https://questmart.internal/admin", {
        headers: { cookie: incoming.get("cookie") || "" },
      }),
      { allowPasswordChange: true },
    );
    return <AdminConsole initialUser={user} />;
  } catch (error) {
    return <AdminAccess status={error.status || 500} />;
  }
}
