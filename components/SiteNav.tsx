"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Game } from "@/lib/types";

/**
 * The one shared header. It figures the current game out from the path so the
 * manual and agent links stay in the section you're already in.
 */
export function SiteNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const game: Game = pathname.startsWith("/hsr") ? "hsr" : "zzz";

  const links = [
    { href: "/", label: "Showcase" },
    { href: `/${game}/manual`, label: "Manual" },
    { href: "/agent", label: "Agent" },
  ];

  return (
    <div className="shell flex flex-wrap items-center justify-between gap-3 py-5">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2.6l2.5 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6 6.5 19.7l1.4-6.3L3.1 9.1l6.4-.6z"
              fill="#7cf5d0"
            />
          </svg>
        </span>
        <span className="font-display text-[17px] font-semibold tracking-[0.1em]">ASTRA</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-1 text-[12px] text-muted sm:gap-3">
        {children}
        {links.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2 py-1 transition-colors ${
                active
                  ? "bg-white/[0.08] text-white"
                  : "hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
