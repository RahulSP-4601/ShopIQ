import type { Metadata } from "next";
import { Eagle_Lake } from "next/font/google";
import "./globals.css";
import { CookieConsentProvider } from "@/components/cookie-consent";

const eagleLake = Eagle_Lake({
  variable: "--font-eagle-lake",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FRAX — Get all your marketplaces in 1 FRAX",
  description: "AI-powered analytics for multi-channel e-commerce sellers. Connect Shopify, Amazon, Flipkart, and 50+ marketplaces. Get unified insights in one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${eagleLake.variable} font-sans antialiased`}>
        <CookieConsentProvider>{children}</CookieConsentProvider>
      </body>
    </html>
  );
}
