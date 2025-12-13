import "./globals.css"; // Import global styles
import { Inter } from "next/font/google";
import { NextAuthProvider } from "@/app/components/NextAuthProvider";
import Navbar from "@/app/components/Navbar";
import React from "react";
import FloatingInbox from "@/app/components/FloatingInbox";

const inter = Inter({ subsets: ["latin"] });

// Define standard metadata for the application
export const metadata = {
  title: "Furniture Exchange MVP",
  description:
    "Community platform for exchanging, donating, and selling used furniture.",
};

// The Root Layout (Server Component)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/*WRAP WITH NEXTAUTH PROVIDER */}
        <NextAuthProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <FloatingInbox />
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
