import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventure — Find Techno, House & Club Events Worldwide",
  description:
    "Live interactive map of club events worldwide. Discover the best techno, house, and electronic music events in London, Tokyo, Osaka, Tbilisi, and more. Real-time schedules and ticket links.",
  keywords: ["club events", "techno parties", "house music events", "rave map", "Tbilisi nightlife", "Tokyo clubs", "Osaka techno", "London raves", "music events map"],
  openGraph: {
    title: "Eventure — Find Techno, House & Club Events Worldwide",
    description: "Discover the best club & music events happening right now globally.",
    type: "website",
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
  themeColor: "#0D1117",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
