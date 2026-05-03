import type { Metadata } from "next";
import { ConditionalAnalytics } from "@/components/ConditionalAnalytics";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle =
  "FamilyMedVault — Family health records & emergency readiness";
const siteDescription =
  "Organize family medical records, appointments, medications, and emergency health info in one secure place.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.familymedvault.com"),
  title: {
    default: siteTitle,
    template: "%s · FamilyMedVault",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.familymedvault.com",
    siteName: "FamilyMedVault",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
