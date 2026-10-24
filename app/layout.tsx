import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { Toaster } from "sonner";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header-server";

import { SITE } from "@/lib/config";

import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${SITE.name} | ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["ژتون غذا", "خرید ژتون", "فروش ژتون", "دانشگاه", "سلف"],
  openGraph: {
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
    locale: "fa_IR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative flex min-h-full flex-col">
        <div
          aria-hidden
          className="dot-grid pointer-events-none fixed inset-0 -z-50 opacity-70"
        />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        <Toaster
          position="bottom-center"
          dir="rtl"
          toastOptions={{
            classNames: {
              toast: "glass-strong !rounded-2xl !text-ink !shadow-lift",
              description: "!text-ink-muted",
              actionButton: "!bg-brand-400 !text-canvas",
            },
          }}
        />
      </body>
    </html>
  );
}