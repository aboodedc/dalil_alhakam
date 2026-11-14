import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import {
  Amiri,
  Geist_Mono,
  IBM_Plex_Sans_Arabic,
  Noto_Naskh_Arabic,
  Readex_Pro,
} from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/common/language-provider";
import { ThemeProvider } from "@/components/common/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

// Display face for headings and the navbar wordmark only. It is a local Saudi
// typeface, so no external request is made for it. Each file is mapped to its
// real weight so `font-semibold`, `font-bold`, etc. resolve without synthesis.
const thmanyahSans = localFont({
  variable: "--font-thmanyah-sans",
  src: [
    {
      path: "../public/fonts/thmanyah-sans-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyah-sans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyah-sans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyah-sans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyah-sans-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: ["IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"],
});

// Default UI face: Arabic-first with Latin coverage. It applies to body copy,
// buttons, navigation, forms and every non-heading interface element.
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Kept for the canvas/PDF/share export templates, which reference this variable
// directly. It is no longer part of the live UI font stack.
const readexPro = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Naskh face for hadith text, sanad cards and every export template. It is
// served from the app origin (next/font), so canvas/PDF/image capture can
// embed it without CORS problems.
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

// Amiri has no glyph for U+FD41 (﵁ الرضي الله عنه) — the honorific the
// corpus puts after every companion's name — and U+FDFA (ﷺ) only in some
// builds. Noto Naskh Arabic covers the whole Arabic Presentation Forms range
// and is used as the fallback so exports never show a missing-glyph box.
const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh",
  subsets: ["arabic"],
  weight: ["400", "700"],
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
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Apple-style light-first theme: only switch to dark when the user explicitly
// chose it. Runs before hydration (injected into <head>) so the correct theme
// class is present on first paint — no flash, and React never renders a
// <script> tag.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("dalil-theme");if(s==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${thmanyahSans.variable} ${ibmPlexSansArabic.variable} ${geistMono.variable} ${readexPro.variable} ${amiri.variable} ${notoNaskh.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
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
