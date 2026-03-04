import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inflect",
  description: "Know how you sound.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
