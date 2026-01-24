"use client";

import { usePathname } from "next/navigation";
import { useEffect, memo } from "react";

export const BodyClass = memo(function BodyClass() {
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
});
