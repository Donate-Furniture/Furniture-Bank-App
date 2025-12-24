// Listing Card Component: A reusable UI element for displaying item summaries in grids/lists.
// Includes logic for relative time formatting ("2 days ago"), dynamic status badges, and fallback image handling.

import React from "react";
import Link from "next/link";
import { Listing } from "@/lib/types";

interface ListingProps {
  listing: Listing;
}

// --- Helper: Relative Time Formatter ---
// Converts ISO timestamps into human-readable strings (e.g., "5 minutes ago")
const timeAgo = (dateString: string): string => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};

// --- Helper: Status Badge Styling ---
// Returns Tailwind classes based on the item's current availability status
const getStatusStyles = (status: string) => {
  switch (status) {
    case "donated":
      return "bg-gray-800 text-white";
    case "on_hold":
      return "bg-yellow-400 text-yellow-900";
    case "available":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-200 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  if (status === "on_hold") return "On Hold";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const ListingCard: React.FC<ListingProps> = ({ listing }) => {
  // Safe defaults for display
  const imageUrl = listing.imageUrls[0];
  const formattedDate = timeAgo(listing.createdAt);

  // formatting price: 0 becomes "FREE"
  const displayPrice =
    listing.estimatedValue && listing.estimatedValue > 0
      ? `$${listing.estimatedValue.toFixed(2)}`
      : "FREE";

  return (
    // Wrap the entire card in a Link for better UX (entire card is clickable)
    <Link href={`/listings/${listing.id}`} passHref legacyBehavior>
      <div className="bg-card-bg rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-gray-100 cursor-pointer">
        {/* --- Image Section --- */}
        <div className="relative h-48 w-full bg-gray-200">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            // Fallback: If image fails to load, show a placeholder
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x400/CCCCCC/333333?text=No+Image";
            }}
          />
          {/* Status Badge Overlay */}
          <div
            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold uppercase shadow-sm ${getStatusStyles(
              listing.status
            )}`}
          >
            {getStatusLabel(listing.status)}
          </div>
        </div>

        {/* --- Content Section --- */}
        <div className="p-4">
          {/* Price & Category */}
          <div className="flex justify-between items-center mb-2">
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full ${
                listing.estimatedValue && listing.estimatedValue > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {displayPrice}
            </span>
            <span className="text-xs text-gray-500">{listing.category}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-1 truncate">
            {listing.title}
          </h3>

          {/* Location With Icon */}
          <p className="text-sm text-gray-600 mb-3 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 019.9 0 7 7 0 010 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            {listing.city}
          </p>

          {/* Footer: Seller & Time */}
          <div className="border-t border-gray-100 pt-3 mt-3 text-xs text-gray-500">
            Posted by {listing.user.firstName} {listing.user.lastName.charAt(0)}
            .<span className="float-right">{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
