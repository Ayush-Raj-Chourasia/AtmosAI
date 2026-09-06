import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import clsx from 'clsx';
import Providers from './providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "N-WEIS — National Weather Event Intelligence System | IMD",
  description: "Real-time AI-powered national weather intelligence and multi-source event verification platform (SIH 2026 | SIH26069).",
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      <body className={clsx(inter.variable, "bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-500 selection:text-white")}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
