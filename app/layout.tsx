import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winter Arc · Your daily commitment",
  description: "Your private September 28–December 30, 2026 challenge tracker. Small actions. Every day.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
