import AccountEmailPage from "../components/AccountEmailPage";
export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <AccountEmailPage action="reset" />;
}
