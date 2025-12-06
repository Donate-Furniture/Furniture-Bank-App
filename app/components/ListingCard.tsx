// File: app/components/ListingCard.tsx
import React from 'react';
import Link from 'next/link';
import { Listing } from '@/lib/types';

interface ListingProps {
  listing: Listing;
}

// Utility function to format the post date
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

const ListingCard: React.FC<ListingProps> = ({ listing }) => {
  const imageUrl = listing.imageUrls[0];
  const formattedDate = timeAgo(listing.createdAt);
   const displayPrice = listing.estimatedValue && listing.estimatedValue > 0 
    ? `$${listing.estimatedValue.toFixed(2)}` 
    : 'FREE';

 return (
    // Wrap the entire card in a Link component using the listing ID
    <Link href={`/listings/${listing.id}`} passHref legacyBehavior>
      <div className="bg-card-bg rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-gray-100 cursor-pointer">
        
        {/* Image Container */}
        <div className="relative h-48 w-full bg-gray-200">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            // Placeholder fallback in case of bad image URL
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/CCCCCC/333333?text=No+Image';
            }}
          />
        </div>

         <div className="p-4">
          {/* Price Tag */}
          <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  listing.estimatedValue && listing.estimatedValue > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                  {/* Show Estimated Value */}
                  {displayPrice}
              </span>
              <span className="text-xs text-gray-500">{listing.category}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-1 truncate">
            {listing.title}
          </h3>

          {/* Location & Post Date */}
          <p className="text-sm text-gray-600 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 019.9 0 7 7 0 010 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {listing.city}
          </p>

          {/* Seller Info */}
          <div className="border-t border-gray-100 pt-3 mt-3 text-xs text-gray-500">
              Posted by {listing.user.firstName} {listing.user.lastName.charAt(0)}. 
              <span className="float-right">{formattedDate}</span>
          </div>

        </div>
      </div>
    </Link>
  );
};

export default ListingCard;