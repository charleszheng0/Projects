"use client";

import { memo } from "react";

export const Footer = memo(function Footer() {
  return (
    <footer className="site-footer flex items-center justify-between px-6 pb-8 pt-12 text-[11px] uppercase tracking-[0.3em] text-muted md:px-16">
      <div className="text-left">czheng276@gmail.com</div>
      <div className="flex items-center gap-6 text-right">
        <a 
          href="https://www.linkedin.com/in/-charleszheng/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transition-all hover:opacity-70 hover:line-through"
        >
          LinkedIn ↗
        </a>
        <a 
          href="https://github.com/charleszheng0" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transition-all hover:opacity-70 hover:line-through"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  );
});
