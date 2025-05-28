import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BucketCreator from '../components/BucketCreator';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Düğün Fotoğrafları',
  description: 'Düğün anılarınızı paylaşabileceğiniz ve görebileceğiniz modern platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          <BucketCreator />
        {children}
        <SpeedInsights />
        <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
