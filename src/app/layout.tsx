import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import SplashRemover from "@/components/SplashRemover";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Music Academy Pro",
  description: "High-end LMS for music students with studio-quality tools",
  manifest: "/manifest.json",
  // favicon.ico + icon.svg in src/app/ are picked up automatically by Next.js App Router.
  // Apple touch icons must still be declared explicitly.
  icons: {
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Music Academy Pro",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-primary">
        {/* PWA splash overlay — shown immediately before any CSS loads, removed on mount */}
        <div
          id="app-splash"
          aria-hidden="true"
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#0A0A0A",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            zIndex: 9999,
            transition: "opacity 0.35s ease-out",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100" style={{ borderRadius: "22px" }}>
            <rect width="100" height="100" rx="20" fill="#0A0A0A"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#D4AF37" strokeWidth="2.5" opacity="0.35"/>
            <ellipse cx="44" cy="63" rx="9" ry="6.5" transform="rotate(-20,44,63)" fill="#D4AF37"/>
            <rect x="52.2" y="28" width="3.2" height="36" rx="1.6" fill="#D4AF37"/>
            <path d="M55.4 28 Q72 35 65 52" stroke="#D4AF37" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
            <circle cx="72" cy="68" r="2.2" fill="#B8960E" opacity="0.6"/>
          </svg>
          <p style={{ color: "#D4AF37", fontFamily: "sans-serif", fontSize: "14px", letterSpacing: "0.08em", margin: 0 }}>
            Music Academy Pro
          </p>
        </div>
        <SplashRemover />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
