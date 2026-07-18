import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { IdentitySync } from "@/components/providers/IdentitySync";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monopoly Royale — Multiplayer Property Game",
  description:
    "Play a modern multiplayer Monopoly-inspired game with friends. Private rooms, custom boards, real-time chat, and beautiful animations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${fraunces.variable} antialiased`}>
        <Providers>
          <IdentitySync>{children}</IdentitySync>
        </Providers>
      </body>
    </html>
  );
}
