import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieConsentProvider } from "@/components/cookie-consent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Frame — Get all your marketplaces in 1 Frame",
  description: "AI-powered analytics for multi-channel e-commerce sellers. Connect Shopify, Amazon, Flipkart, and 50+ marketplaces. Get unified insights in one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <CookieConsentProvider>{children}</CookieConsentProvider>
      </body>
    </html>
  );
}
