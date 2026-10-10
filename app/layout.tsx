import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { RoleProvider } from "@/src/context/RoleContext";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Hydris Stewardship Command Centre",
  description: "Water stewardship you can prove: rank where to act, show the benefit, and trace every number to its evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
