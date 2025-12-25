"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/game", label: "Play" },
    { href: "/analytics", label: "Analytics" },
    { href: "/ranges", label: "Ranges" },
    { href: "/simulator", label: "Simulator" },
    { href: "/dataset", label: "Dataset" },
  ];

  return (
    <nav className="mb-6">
      <div className="flex justify-center gap-2 flex-wrap">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "outline"}
                className={
                  isActive
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-800"
                }
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

