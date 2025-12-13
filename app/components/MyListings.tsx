"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";

export default function MyListings() {
  const { status } = useSession(); // We just check status, cookies handle the rest
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if authenticated
    if (status !== "authenticated") return;

    const fetchMyListings = async () => {
      try {
        // No headers needed! Cookies are sent automatically.
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

      {isLoading && <p className="text-center py-8">Loading your items...</p>}
      {error && <p className="text-center py-8 text-red-600">Error: {error}</p>}

      {!isLoading && listings.length === 0 && !error && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-lg text-gray-500">
            You haven't posted any furniture yet.
          </p>
        </div>
      )}

      {/* Display Listings in a Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {listings.map((listing) => (
          // We reuse the existing ListingCard component
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
