import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CMTCommand Operational vNext",
    template: "%s | CMTCommand Operational vNext",
  },
  description: "Technical scaffold for the CMTCommand Operational vNext application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
