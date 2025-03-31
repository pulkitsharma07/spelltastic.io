import "./globals.css";
import { Noto_Sans } from "next/font/google";
import { Viewport } from "next";

const notoSans = Noto_Sans({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
