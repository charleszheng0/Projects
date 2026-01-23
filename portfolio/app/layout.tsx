import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NavMenu } from "../components/NavMenu";
import { NeuralBackground } from "../components/NeuralBackground";
import { Footer } from "../components/Footer";
import { BodyClass } from "../components/BodyClass";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Charles Zheng | Portfolio",
  description: "Predictive minimalism portfolio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        <NeuralBackground />
        <BodyClass />
        <div className="relative z-10">
          <NavMenu />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
