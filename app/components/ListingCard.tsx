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

 return (
    // Wrap the entire card in a Link component using the listing ID
    <Link href={`/listings/${listing.id}`} passHref legacyBehavior>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-gray-100 cursor-pointer">
        
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
                  listing.price !== null && listing.price > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                  {listing.price !== null && listing.price > 0 ? `$${listing.price.toFixed(2)}` : 'FREE / TRADE'}
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
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 0110.9 0L14.7 4.7a5 5 0 00-8.4 0L5.05 4.05zM4 6.7a9 9 0 0112 0l-1 1a7 7 0 00-10 0l-1-1zM3 9.3a11 11 0 0114 0l-1 1a9 9 0 00-12 0l-1-1zM2 12a13 13 0 0116 0l-1 1a11 11 0 00-14 0l-1-1zM1 14.7a15 15 0 0118 0l-1 1a13 13 0 00-16 0l-1-1z" clipRule="evenodd" />
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