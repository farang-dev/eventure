import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventure — Find Techno, House & Club Events Worldwide",
  description:
    "Live interactive map of club events worldwide. Discover the best techno, house, and electronic music events in London, Tokyo, Osaka, Tbilisi, and more. Real-time schedules and ticket links.",
  keywords: ["club events", "techno parties", "house music events", "rave map", "Tbilisi nightlife", "Tokyo clubs", "Osaka techno", "London raves", "music events map"],
  alternates: {
    canonical: "https://www.eventurer.online",
  },
  openGraph: {
    title: "Eventure — Find Techno, House & Club Events Worldwide",
    description: "Discover the best club & music events happening right now globally.",
    type: "website",
    siteName: "Eventure",
    locale: "en_US",
    images: [{ url: "https://www.eventurer.online/apple-touch-icon.svg", width: 180, height: 180 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eventure — Find Techno, House & Club Events Worldwide",
    description: "Discover the best club & music events happening right now globally.",
    images: ["https://www.eventurer.online/apple-touch-icon.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eventure",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0D1117" },
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
  ],
};

import NextAuthProvider from "@/components/NextAuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "Eventure",
                  url: "https://www.eventurer.online",
                  logo: "https://www.eventurer.online/favicon.svg",
                  description: "Live interactive map of club events worldwide.",
                },
                {
                  "@type": "WebSite",
                  url: "https://www.eventurer.online",
                  name: "Eventure",
                  description: "Find techno, house & club events worldwide on a live map.",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://www.eventurer.online/?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PZ1K9BVYDK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-PZ1K9BVYDK');
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("eventure-map-style");document.documentElement.setAttribute("data-theme",!s||s.includes("dark")?"dark":"light");}catch(e){}})()`,
          }}
        />
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
