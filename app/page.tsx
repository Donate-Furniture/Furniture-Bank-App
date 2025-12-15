// File: app/page.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ListingCard from "@/app/components/ListingCard";
import { Listing } from "@/lib/types";

const CATEGORIES = [
  { name: "Furniture", icon: "🛋️" },
  { name: "Vehicles", icon: "🚗" },
  { name: "Books", icon: "📚" },
  { name: "Antique", icon: "⚱️" },
];

export default function Home() {
  const { data: session } = useSession();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch only the 4 most recent listings
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch("/api/listings?limit=4&sort=date_desc");
        const data = await res.json();
        setRecentListings(data.listings || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
 <div className="min-h-screen bg-gray-50">
      
      {/* 1. HERO SECTION (Welcome for logged out) */}
      {!session && (
        <div className="bg-indigo-600 text-white py-16 text-center">
            <h1 className="text-4xl font-extrabold mb-4">Furniture Exchange MVP</h1>
            <p className="text-lg mb-8 opacity-90">Join the community to trade furniture securely.</p>
            <div className="flex justify-center gap-4">
                <Link href="/auth?mode=register" className="bg-white text-indigo-600 py-3 px-6 rounded-lg font-bold hover:bg-gray-100 transition">
                    Start Trading
                </Link>
                <Link href="/auth" className="border border-white text-white py-3 px-6 rounded-lg font-bold hover:bg-indigo-700 transition">
                    Sign In
                </Link>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-12">
        
        {/* 2. BROWSE BY CATEGORY */}
        <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {CATEGORIES.map(cat => (
                    <Link 
                        key={cat.name} 
                        href={`/listings?category=${cat.name}`}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all text-center group"
                    >
                        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
                        <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">{cat.name}</h3>
                    </Link>
                ))}
            </div>
        </section>

        {/* 3. RECENT DONATIONS SECTION */}
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Recent Donations</h2>
                <Link href="/listings" className="text-indigo-600 font-medium hover:underline flex items-center">
                    View More 
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
            </div>

            {isLoading ? (
                <p className="text-center py-10 text-gray-500">Loading recent items...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {recentListings.map(item => (
                        <ListingCard key={item.id} listing={item} />
                    ))}
                    {recentListings.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-white rounded-xl border border-gray-200 text-gray-500">
                            No listings available yet. Be the first!
                        </div>
                    )}
                </div>
            )}
        </section>

      </div>
    </div>
  );
}
