import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://qsport.cz"),
  title: {
    default: "Qsport.cz | výkon bez kompromisů",
    template: "%s | Qsport.cz",
  },
  description: "Sportovní vybavení od značek On, POC, Maloja, Alpina, Mizuno a Leki. Běh, hory, outdoor, zima a cyklistika.",
  openGraph: {
    siteName: "Qsport.cz",
    locale: "cs_CZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-white text-ink overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
