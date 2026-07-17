import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppToaster from "@/app/components/AppToaster";
import AuthSessionProvider from "@/app/components/SessionProvider";
import { SITE_URL } from "@/app/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: "sa’i Hajj & Umrah Kit | Ihram-Safe Personal Care by German Care",
  description:
    "Discover sa’i Hajj and Umrah Kit by German Care. Complete Hajj pack and Umrah travel kit with fragrance-free, alcohol-free personal care essentials for pilgrims.",
  keywords: [
    "sa’i",
    "German Care",
    "Hajj kit",
    "Umrah kit",
    "Hajj pack",
    "Umrah travel kit",
    "Ihram-safe personal care",
    "fragrance-free personal care",
    "alcohol-free personal care",
    "pilgrim essentials",
  ],
  authors: [{ name: "sa’i", url: "https://german-care.com" }],
  creator: "sa’i",
  publisher: "German Care",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "sa’i Hajj & Umrah Kit | Ihram-Safe Personal Care by German Care",
    description:
      "Discover sa’i Hajj and Umrah Kit by German Care. Complete Hajj pack and Umrah travel kit with fragrance-free, alcohol-free personal care essentials for pilgrims.",
    images: ["/logo.png"],
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
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          {children}
          <AppToaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
