import type { Metadata } from "next";
import "./globals.css";
import { CookieConsentProvider } from "@/components/cookie-consent";

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
      <body className="font-sans antialiased">
        <CookieConsentProvider>{children}</CookieConsentProvider>
      </body>
    </html>
  );
}
