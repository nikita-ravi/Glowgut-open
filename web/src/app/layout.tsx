import type { Metadata, Viewport } from "next";

import Link from "next/link";
import { Suspense } from "react";

import { ProductFooter as SiteFooter } from "@/components/ProductView";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { UserMenu } from "@/components/UserMenu";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Open Food Scanner", template: "%s · Open Food Scanner" },
  description: "Scan a grocery barcode and see a health score where every point has a source.",
  applicationName: "Open Food Scanner",
  appleWebApp: { capable: true, title: "Food Scanner", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-4">
          <Link href="/" className="font-semibold">
            Open Food Scanner
          </Link>
          {/* Reads the URL (to return after sign-in), so it must be inside Suspense. */}
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</main>
        <SiteFooter />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
