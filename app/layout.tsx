import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers/wagmi-provider";
import '@rainbow-me/rainbowkit/styles.css';

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  title: "Aarkham - Flash Loan Platform",
  description: "Next generation DeFi flash loan platform with ZK-proof KYC verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body
        className={`${instrumentSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
