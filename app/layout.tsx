import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Party Games", template: "%s · Party Games" },
  description: "Pass-the-phone party games for kids and grown-ups.",
};

export const viewport: Viewport = {
  themeColor: "#FFF4E0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
