import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BaseScreener",
  description: "Base token analytics for aggressive traders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
