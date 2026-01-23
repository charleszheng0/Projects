"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function BodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const className = "home-lock";
    if (pathname === "/") {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }

    return () => document.body.classList.remove(className);
  }, [pathname]);

  return null;
}
