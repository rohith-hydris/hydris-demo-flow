import Link from "next/link";
import { METHODOLOGY_PATH } from "@/src/lib/methodology";
import { Logo } from "./Logo";

const links = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/ranking", label: "Ranking" },
  { href: "/impact", label: "Impact" },
  { href: "/claims", label: "Claims & Evidence" },
  { href: "/copilot", label: "Copilot" },
  { href: METHODOLOGY_PATH, label: "Methodology" },
];

// Blue block with a ghosted HYDRIS wordmark cropped by the bottom edge (DESIGN 3.2). About 260px tall.
export default function Footer() {
  return (
    <footer className="mx-4 mt-16 sm:mx-8">
      <div className="bg-footer relative mx-auto h-[260px] max-w-[1240px] overflow-hidden rounded-t-panel text-white">
        <div className="relative z-10 flex h-full flex-col justify-between p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <Logo mark="text-white" />
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center font-semibold text-white/90 hover:text-white hover:underline">{l.label}</Link>
              ))}
            </nav>
          </div>
          <p className="text-sm text-white/85">Demo with illustrative data. Hydris AI.</p>
        </div>
        <span className="footer-wordmark" aria-hidden="true">HYDRIS</span>
      </div>
    </footer>
  );
}
