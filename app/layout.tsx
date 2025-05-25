import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BucketCreator from '../components/BucketCreator';
import { ThemeProvider } from '../contexts/ThemeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Düğün Fotoğrafları',
  description: 'Düğün anılarınızı paylaşabileceğiniz ve görebileceğiniz platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 transition-colors duration-300`}
      >
        <ThemeProvider>
          <BucketCreator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
} 