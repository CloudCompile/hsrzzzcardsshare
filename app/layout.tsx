import type { Metadata } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import { SiteBackdrop } from "@/components/SiteBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { ogImage, siteOrigin } from "@/lib/meta";
import "./globals.css";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-num",
  display: "swap",
});

const siteUrl = siteOrigin();

// One generated image for every link that has no card of its own.
const homeImage = ogImage({
  title: "Your account, carded.",
  sub: "Paste a UID. Get shareable ZZZ and HSR character sheets, team cards and PNG exports.",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Astra — ZZZ & HSR showcase cards from your UID",
    template: "%s · Astra",
  },
  description:
    "Turn your Zenless Zone Zero or Honkai: Star Rail UID into shareable showcase cards: full character sheets with stats, gear, and team build cards. Free, instant, no login.",
  openGraph: {
    title: "Astra — ZZZ & HSR showcase cards",
    description:
      "Full character sheets and team build cards from your UID. Share a link or download a PNG.",
    type: "website",
    siteName: "Astra",
    locale: "en_US",
    url: "/",
    images: [homeImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Astra — ZZZ & HSR showcase cards",
    description:
      "Full character sheets and team build cards from your UID. Share a link or download a PNG.",
    images: [homeImage.url],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#05050a"/><path d="M16 5l3.2 7.4 7.8.7-5.9 5.3 1.7 7.6L16 22.2l-6.8 4 1.7-7.6L5 13.1l7.8-.7z" fill="#7cf5d0"/></svg>`,
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${chakra.variable} ${inter.variable} ${mono.variable}`}>
      <body className="antialiased">
        <SiteBackdrop />
        <div className="relative z-10">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
