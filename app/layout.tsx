import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "H1B Salary Database 2025 — Search 7M Records | H1BData.us",
    template: "%s | H1BData.us",
  },
  description: "Search 7 million H1B salary records from the US Department of Labor. Find H1B salaries by company, job title, and city. Free DOL LCA data 2015–2025.",
  keywords: ["H1B salary", "H1B database", "H1B visa salary", "LCA data", "H1B sponsor"],
  metadataBase: new URL("https://www.h1bdata.us"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "H1BData.us",
    url: "https://www.h1bdata.us",
    title: "H1B Salary Database 2025 — Search 7M Records",
    description: "Search 7 million H1B salary records from the US Department of Labor.",
  },
  twitter: {
    card: "summary_large_image",
    title: "H1B Salary Database 2025 — Search 7M Records",
    description: "Search 7 million H1B salary records from the US Department of Labor.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
