import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Human Signal OS",
  description: "Know how you sound before they do.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
