import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://banglafest.co.uk"),
  title: "Bangla Fest & Award UK",
  description:
    "A year-round identity for an annual UK celebration of Bangladeshi culture, performance, recognition, tradition, and community connection.",
  keywords: [
    "Bangla Fest",
    "Bangladeshi culture",
    "Award UK",
    "cultural festival",
    "UK events",
    "community celebration",
    "London events",
  ],
  authors: [
    {
      name: "Ambrosian Events and Management",
      url: "https://ambrosianuk.com",
    },
  ],
  creator: "Ambrosian Events and Management",
  publisher: "Ambrosian Events and Management",
  robots: "index, follow",
  alternates: {
    canonical: "https://banglafest.co.uk",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://banglafest.co.uk",
    siteName: "Bangla Fest & Award UK",
    title: "Bangla Fest & Award UK",
    description:
      "A year-round identity for an annual UK celebration of Bangladeshi culture, performance, recognition, tradition, and community connection.",
    images: [
      {
        url: "https://banglafest.co.uk/banglafest-logo.png",
        width: 1200,
        height: 630,
        alt: "Bangla Fest & Award UK",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bangla Fest & Award UK",
    description:
      "A year-round identity for an annual UK celebration of Bangladeshi culture, performance, recognition, tradition, and community connection.",
    images: ["https://banglafest.co.uk/banglafest-logo.png"],
    creator: "@BanglafestUK",
  },
  icons: {
    icon: "/fabicon.png",
    shortcut: "/fabicon.png",
    apple: "/banglafest-flat-logo.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${bebasNeue.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
