import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MapleTracker — Roster & Boss Tracker",
  description:
    "Track your MapleStory character roster and weekly boss crystal income.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted flex flex-wrap items-center justify-between gap-2">
            <span>
              A MapleTracker roster &amp; boss tracker. Data stays in your
              browser.
            </span>
            <span className="text-xs">
              Not affiliated with Nexon. Boss crystal values are approximate.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
