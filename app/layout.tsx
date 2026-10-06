import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Readex_Pro } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/common/language-provider";
import { ThemeProvider } from "@/components/common/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const readexPro = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dalil Al-Ahkam — دليل الأحكام",
  description: "Semantic retrieval & citation system for juristic hadith texts",
  applicationName: "Dalil Al-Ahkam — دليل الأحكام",
  // `app/favicon.ico`, `app/icon.png` and `app/apple-icon.png` are picked up
  // automatically by the file-based Metadata API. The explicit list below adds
  // every size phones, tablets and laptops look for (16/32 favicons, 180
  // apple-touch, 192/512 PWA) — all generated from `public/icon_web.png`.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "دليل الأحكام",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F4FF" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

// Participant Guide theme is dark-first: default to dark unless the user chose light.
// Runs before hydration (injected into <head>) so the correct theme class is
// present on first paint — no flash, and React never renders a <script> tag.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("dalil-theme");var d=s?s==="dark":true;if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${readexPro.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-[var(--font-readex),var(--font-geist-sans)] text-foreground">
        <Script id="dalil-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <LanguageProvider>
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
