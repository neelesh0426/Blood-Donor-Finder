import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BloodLink – Blood Donor Finder | Voluntary Donor Directory",
  description:
    "A privacy-conscious directory to find voluntary blood donors by blood group, city, and PIN code when every minute matters. Informational donor directory only.",
  keywords: [
    "blood donor",
    "blood donation",
    "find blood donor",
    "voluntary blood donor",
    "blood group compatibility",
    "O negative universal donor",
    "eRaktKosh alternative",
    "emergency blood search",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  authors: [{ name: "BloodLink Community" }],
};

export const viewport: Viewport = {
  themeColor: "#991b1b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-[#fcfbfb] text-stone-900 font-sans selection:bg-rose-100 selection:text-red-900">
        <PwaInstallBanner />
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
