import './globals.css'; // Import global styles (Tailwind CSS will live here)
import { Inter } from 'next/font/google'; 
import AuthWrapper from '@/app/components/AuthWrapper'; // Import the Client Component wrapper we created
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

// Define Metadata for SEO
export const metadata = {
  title: 'Furniture Exchange MVP',
  description: 'Community platform for exchanging, donating, and selling used furniture.',
};

// The Root Layout Component (Server Component)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 
           The AuthWrapper is a Client Component that holds the AuthProvider.
           Wrapping 'children' here means the entire app has access to useAuth().
        */}
        <AuthWrapper>
          <main className="min-h-screen flex flex-col">
             {/* We will add a Navbar here later */}
            {children}
          </main>
        </AuthWrapper>
      </body>
    </html>
  );
}