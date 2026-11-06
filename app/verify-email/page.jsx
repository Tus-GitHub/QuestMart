import AccountEmailPage from "../components/AccountEmailPage";
export const metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <AccountEmailPage action="verify" />;
}
