import "./globals.css";

export const metadata = {
  title: "Autonomous Job Hunter",
  description: "Discovery, personalization, and automated outreach."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
