import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, Montserrat, Rajdhani } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ClipboardPolyfill } from "@/components/clipboard-polyfill";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Poker GTO Trainer",
  description: "Game Theory Optimal poker training application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${montserrat.variable} ${rajdhani.variable} antialiased`}
          suppressHydrationWarning
        >
          <ClipboardPolyfill />
          <header className="account-slot">
            <SignedOut>
              <div className="flex gap-3">
                <SignInButton>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button
                    variant="default"
                    className="bg-white text-black hover:bg-white/90 transition-colors"
                  >
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="account-avatar">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonTrigger: "outline-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0 hover:scale-[1.02] transition-transform",
                      avatarBox: "w-10 h-10 shadow-none",
                    },
                  }}
                />
              </div>
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
