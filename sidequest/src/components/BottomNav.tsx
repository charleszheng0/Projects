"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Users, User, Shuffle, PlusCircle } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", icon: Shuffle, label: "Quests" },
  { href: "/map", icon: Map, label: "Map" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/create", icon: PlusCircle, label: "Create" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-stone-100 px-2 pb-safe z-50">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all",
                active ? "text-green-600" : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={clsx(active && "drop-shadow-sm")}
              />
              <span className={clsx("text-[10px] font-medium tracking-wide", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
