import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "queued",
  description: "Community-built sidequests for real life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <main className="pb-20">{children}</main>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
