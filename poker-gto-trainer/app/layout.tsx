import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Polyfill for navigator.clipboard to prevent errors in third-party scripts
                if (typeof navigator !== 'undefined' && !navigator.clipboard) {
                  navigator.clipboard = {
                    writeText: function(text) {
                      return new Promise(function(resolve, reject) {
                        try {
                          // Fallback to execCommand if clipboard API not available
                          var textarea = document.createElement('textarea');
                          textarea.value = text;
                          textarea.style.position = 'fixed';
                          textarea.style.left = '-999999px';
                          document.body.appendChild(textarea);
                          textarea.select();
                          var success = document.execCommand('copy');
                          document.body.removeChild(textarea);
                          if (success) {
                            resolve();
                          } else {
                            reject(new Error('Failed to copy text'));
                          }
                        } catch (err) {
                          reject(err);
                        }
                      });
                    },
                    readText: function() {
                      return Promise.reject(new Error('readText not supported'));
                    }
                  };
                }
              `,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <header className="fixed top-0 right-0 z-50 p-4 pr-6">
            <SignedOut>
              <div className="flex gap-3">
                <SignInButton>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
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
