import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SUIS — Smart University Intelligence System",
  description:
    "Integrated Smart Campus & University Management Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="h-full bg-theme-base font-sans antialiased text-theme-text">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
