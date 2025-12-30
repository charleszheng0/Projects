"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/game", label: "Train" },
    { href: "/analytics", label: "Analytics" },
    { href: "/ranges", label: "Ranges" },
    { href: "/simulator", label: "Simulator" },
    { href: "/dataset", label: "Dataset" },
  ];

  return (
    <nav className="flex gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={
                isActive
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

