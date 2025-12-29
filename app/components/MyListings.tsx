// My Listings Component: A dashboard widget that fetches and displays the authenticated user's active inventory.
// Handles loading states, empty states, and renders the grid using the shared ListingCard component.

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";

export default function MyListings() {
  // Access session status to conditionally trigger data fetching
  const { status } = useSession();

  // --- Local State ---
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Guard: Only attempt fetch if user is confirmed authenticated
    if (status !== "authenticated") return;

    const fetchMyListings = async () => {
      try {
        // 2. Fetch Data: Cookies are sent automatically by the browser
        // Points to app/api/listings/user/route.ts
        const res = await fetch("/api/listings/mine", {
          method: "GET",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch your listings.");
        }

        setListings(data.listings);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyListings();
  }, [status]);

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">
        My Posted Items ({listings.length})
      </h2>

      {/* --- State: Loading & Error --- */}
      {isLoading && <p className="text-center py-8">Loading your items...</p>}
      {error && <p className="text-center py-8 text-red-600">Error: {error}</p>}

      {/* --- State: Empty --- */}
      {!isLoading && listings.length === 0 && !error && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-lg text-gray-500">
            You haven't posted any furniture yet.
          </p>
        </div>
      )}

      {/* --- State: List Display --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {listings.map((listing) => (
          // Reuse the global ListingCard for consistent UI
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
