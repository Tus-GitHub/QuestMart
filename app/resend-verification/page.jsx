import AccountEmailPage from "../components/AccountEmailPage";
export const metadata = {
  title: "Resend verification",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <AccountEmailPage action="resend" />;
}
