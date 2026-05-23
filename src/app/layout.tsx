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

export const metadata: Metadata = {
  title: "Task-Flow",
  description: "Media Player & Task Dashboard",
};

import { Suspense } from "react";
import { UploadProvider } from "../components/UploadManager";
import { AudioProvider } from "../contexts/AudioProvider";
import { MobileContainer } from "../components/MobileContainer";

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
        <UploadProvider>
          <AudioProvider>
            {children}
            <Suspense fallback={null}>
              <MobileContainer />
            </Suspense>
          </AudioProvider>
        </UploadProvider>
      </body>
    </html>
  );
}
