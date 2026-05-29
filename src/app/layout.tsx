import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const seoDescription =
  "word of the day lists are great, but without practice you forget them. wotd turns new words into a local review deck.";

export const metadata: Metadata = {
  title: {
    default: "wotd - Local vocabulary practice deck",
    template: "%s | wotd",
  },
  description: seoDescription,
  applicationName: "wotd",
  authors: [{ name: "nuua", url: "https://github.com/drstuggels" }],
  creator: "nuua",
  publisher: "nuua",
  keywords: [
    "vocabulary practice",
    "word of the day",
    "flashcards",
    "dictionary",
    "synonyms",
    "local-first app",
  ],
  category: "education",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/wotd-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/wotd-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/wotd-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "wotd - Local vocabulary practice deck",
    description: seoDescription,
    siteName: "wotd",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  twitter: {
    card: "summary",
    title: "wotd - Local vocabulary practice deck",
    description: seoDescription,
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
