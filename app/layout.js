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
        <main className="bg-black min-h-screen">
          <Navbar />
          {children}
        </main>
      </body>
    </html>
  );
}
