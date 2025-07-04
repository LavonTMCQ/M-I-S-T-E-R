import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { WalletHeader } from "@/components/WalletHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MISTER - AI-Powered Copy Trading",
  description: "Advanced machine learning algorithms for automated copy trading on Cardano perpetual swaps. Non-custodial, secure, and designed for the future of DeFi.",
  keywords: ["DeFi", "Copy Trading", "Cardano", "AI Trading", "Perpetual Swaps", "Strike Finance"],
  authors: [{ name: "MISTER Team" }],
  robots: "index, follow",
  openGraph: {
    title: "MISTER - AI-Powered Copy Trading",
    description: "Advanced machine learning algorithms for automated copy trading on Cardano perpetual swaps.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MISTER - AI-Powered Copy Trading",
    description: "Advanced machine learning algorithms for automated copy trading on Cardano perpetual swaps.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ErrorBoundary>
          <WalletProvider>
            <AuthProvider>
              <Navigation />
              <WalletHeader />
              <div className="container mx-auto px-4">
                <Breadcrumbs />
              </div>
              {children}
            </AuthProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
