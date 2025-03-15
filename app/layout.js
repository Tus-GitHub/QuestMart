import { Providers } from "@/redux/provider";
import Navbar from "./component/Navbar";
import "./globals.css";

export const metadata = {
  title: "QuickMart",
  description: "Sell And Buy Video Games",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="bg-black min-h-screen">
            <Navbar />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
