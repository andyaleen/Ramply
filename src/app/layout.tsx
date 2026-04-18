import type { Metadata } from "next";
import { Inter, Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

/**
 * Ramply brand fonts. Instrument Serif is reserved for display typography
 * (hero headlines, stat numbers, page titles); DM Sans drives the rest of
 * the UI. Both are exposed as CSS variables so arbitrary-value Tailwind
 * classes can reach them without extra config.
 */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: 'swap',
  variable: '--font-instrument-serif',
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: "Ramply - Streamline Your Onboarding Process",
  description: "Simplify vendor and customer onboarding with one-click links and reusable information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${dmSans.variable} font-sans`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
