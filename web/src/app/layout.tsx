import type { Metadata, Viewport } from "next";

import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

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
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</main>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
