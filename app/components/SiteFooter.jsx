import Link from "next/link";
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/" className="wordmark">
          quest<span>mart</span>
          <i>®</i>
        </Link>
        <p>Discover your next world. Keep the game going.</p>
        <div>
          <Link href="/#discover">Find your next game ↗</Link>
          <Link href="/sell">Pass on a favorite ↗</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} QuestMart. Made for the love of play.
        </span>
        <span>Game artwork © respective publishers.</span>
      </div>
    </footer>
  );
}
