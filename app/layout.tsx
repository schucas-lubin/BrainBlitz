import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrainBlitz",
  description: "A study tool that turns content into quizzes, games, and learning materials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

