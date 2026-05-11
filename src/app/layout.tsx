import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventure — Find Club & Music Events Worldwide",
  description:
    "Discover the best techno, house, drum and bass, and club events happening tonight. Live map view with urgency-based visual hierarchy.",
  keywords: ["club events", "techno", "house music", "rave map", "music events map", "EDM", "dubstep"],
  openGraph: {
    title: "Eventure — Find Club & Music Events Worldwide",
    description: "Discover the best club & music events happening right now.",
    type: "website",
  },
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
