"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/game", label: "Train" },
    { href: "/analytics", label: "Analytics" },
    { href: "/ranges", label: "Ranges" },
    { href: "/dataset", label: "Dataset" },
  ];

  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                isActive
                  ? "text-white border-amber-400"
                  : "text-gray-400 border-transparent hover:text-white hover:border-gray-600"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

