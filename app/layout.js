import { Providers } from "@/redux/provider";
import ClientInitializer from "./ClientInitializer";
import UIProvider from "./components/UIProvider";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import "./globals.css";
export const metadata = {
  title: {
    default: "QuestMart — Your next adventure awaits",
    template: "%s · QuestMart",
  },
  description:
    "Discover your next favorite. Buy and sell pre-owned physical games with other players on QuestMart.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <UIProvider>
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            <ClientInitializer />
            <SiteHeader />
            <main id="main-content">{children}</main>
            <SiteFooter />
          </UIProvider>
        </Providers>
      </body>
    </html>
  );
}
