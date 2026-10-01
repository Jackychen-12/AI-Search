import Link from "next/link";
import SearchBar from "./SearchBar";
import NavLinks from "./NavLinks";
import GitHubMark from "./GitHubMark";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3 md:gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-sm font-bold shadow-sm">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight dark:text-white">AI Search</span>
        </Link>

        <div className="flex-1 max-w-xl">
          <SearchBar />
        </div>

        <NavLinks />

        {/* Desktop shows this in NavLinks; phones hide NavLinks, so keep the repo entry here. */}
        <a
          href="https://github.com/Jackychen-12/AI-Search"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="md:hidden shrink-0 text-gray-500 dark:text-gray-400 hover:text-brand-600"
        >
          <GitHubMark className="w-5 h-5" />
        </a>
      </div>
    </header>
  );
}
