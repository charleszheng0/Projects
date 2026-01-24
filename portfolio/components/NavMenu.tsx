"use client";

import Link from "next/link";
import { memo } from "react";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "PROJECTS", href: "/projects" },
  { label: "EXPERIENCE", href: "/experience" },
  { label: "OTHER", href: "/skills" },
];

export const NavMenu = memo(function NavMenu() {
  return (
    <header className="fixed left-6 right-6 top-6 z-30 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-ink">
      <nav className="flex flex-wrap items-center gap-6">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-all hover:opacity-70 hover:line-through"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <a
        href="https://drive.google.com/file/d/12zaALJ5TDh-Qe2tMreWwBEpwYaJ-KIrZ/view?usp=sharing"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] tracking-[0.3em] text-muted transition-all hover:opacity-70 hover:line-through"
      >
        Resume ↗
      </a>
    </header>
  );
});
