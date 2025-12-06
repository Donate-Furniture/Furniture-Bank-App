// File: app/page.tsx
'use client';

import { useSession, signOut } from 'next-auth/react'; 
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ListingCard from '@/app/components/ListingCard';
import { Listing } from '@/lib/types';

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const user = session?.user; // Contains name, email, image, and our custom firstName/lastName

  // State for listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [isFetchingListings, setIsFetchingListings] = useState(true);

  // Function to fetch listings from the backend API
  const fetchListings = async () => {
    try {
      const res = await fetch('/api/listings', { method: 'GET' });
      const data = await res.json();

      if (res.ok) {
        setListings(data.listings);
      } else {
        console.error('Failed to fetch listings:', data.error);
        setListings([]);
      }
    } catch (error) {
      console.error('Network error fetching listings:', error);
    } finally {
      setIsFetchingListings(false);
    }
  };

  // Fetch listings only when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
        fetchListings();
    } else if (status === 'unauthenticated') {
        setIsFetchingListings(false);
    }
  }, [status]);


  // --- Render Logic ---

  if (isLoading || (isAuthenticated && isFetchingListings)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading application data...</p>
      </div>
    );
  }

  // --- Logged In Dashboard ---
  if (isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold text-gray-800">
                {/* Access custom fields via type assertion or fallback */}
                Welcome Back, {(user as any)?.firstName || user?.name || 'User'}!
            </h2>
        </div>
        
        {/* Listings Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.length > 0 ? (
                listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                ))
            ) : (
                <div className="col-span-full text-center py-20 text-gray-500">
                    <p className="text-xl mb-4">No listings found yet!</p>
                    <Link 
                        href="/listings/create"
                        className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        Be the first to post an item.
                    </Link>
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- Logged Out Welcome Screen ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-6 text-indigo-600">
        Furniture Exchange MVP
      </h1>
      <div className="space-y-4">
          <p className="text-lg text-gray-600 mb-4">
            Join the community to trade furniture securely.
          </p>
          
          <div className="flex gap-4 justify-center">
            {/* Primary Action: Register */}
            <Link
              href="/auth?mode=register"
              className="bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md"
            >
              Start Trading (Register)
            </Link>

            {/* Secondary Action: Login */}
            <Link
              href="/auth"
              className="bg-white border border-indigo-600 text-indigo-600 py-3 px-6 rounded-lg font-medium hover:bg-indigo-50 transition-colors shadow-md"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>
    </div>
  );
}