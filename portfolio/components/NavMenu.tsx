"use client";

import Link from "next/link";
import { memo, useMemo } from "react";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "PROJECTS", href: "/projects" },
  { label: "EXPERIENCE", href: "/experience" },
  { label: "SKILLS", href: "/skills" },
];

export const NavMenu = memo(function NavMenu() {
  return (
    <header className="fixed left-6 right-6 top-6 z-30 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-ink">
      <nav className="flex flex-wrap items-center gap-6">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-opacity hover:opacity-70"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Link
        href="#"
        className="text-[11px] tracking-[0.3em] text-muted transition-opacity hover:opacity-70"
      >
        Resume ↗
      </Link>
    </header>
  );
});
