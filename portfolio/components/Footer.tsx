"use client";

export function Footer() {
  return (
    <footer className="site-footer flex items-center justify-between px-6 pb-8 pt-12 text-[11px] uppercase tracking-[0.3em] text-muted md:px-16">
      <div className="text-left">czheng276@gmail.com</div>
      <div className="flex items-center gap-6 text-right">
        <a href="#" className="transition-opacity hover:opacity-70">
          LinkedIn
        </a>
        <a href="#" className="transition-opacity hover:opacity-70">
          GitHub
        </a>
      </div>
    </footer>
  );
}
