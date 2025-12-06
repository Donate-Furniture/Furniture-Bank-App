// File: app/listings/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; 
import Link from 'next/link';
import { Listing } from '@/lib/types'; 
import { useSession } from 'next-auth/react'; 

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

// Helper to get status badge color
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'available':
            return <span className="text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-800">Available</span>;
        case 'on_hold': // 'on hold for someone'
            return <span className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">On Hold</span>;
        case 'donated':
            return <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-600">Donated</span>;
        default:
            return <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
};

export default function ListingDetailPage() {
  const params = useParams(); 
  const listingId = params.id as string;
  
  // ✅ CHANGE: Use NextAuth session to get the current user
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Listing could not be loaded.');
        }

        setListing(data.listing);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch listing data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
        const res = await fetch(`/api/listings/${listingId}`, {
            method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete');

        alert('Listing deleted successfully');
        router.push('/profile'); 
    } catch (error) {
        alert('Error deleting listing');
        setIsDeleting(false);
    }
  };

  if (isLoading) return <p className="text-center p-10">Loading Listing Details...</p>;
  if (error) return <p className="text-center p-10 text-red-600">Error: {error}</p>;
  if (!listing) return <p className="text-center p-10">Listing Not Found (404)</p>;

  // --- Ownership Check ---
  const isOwner = user && (user as any).id === listing.user.id;

  // Use estimatedValue for Tax Receipt purposes
  const taxValue = listing.estimatedValue !== null 
    ? `$${listing.estimatedValue.toFixed(2)}` 
    : 'Pending Calculation';

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 bg-white shadow-lg rounded-xl my-10">
      
      <Link href="/" className="text-indigo-600 hover:underline mb-4 inline-block">
        &larr; Back to Listings
      </Link>
      
      <div className="md:flex md:space-x-8">
        
        {/* Left Column: Image & Donor Info */}
        <div className="md:w-1/2 space-y-6">
            <div className="bg-gray-200 rounded-lg overflow-hidden shadow-md h-64 md:h-80">
                <img 
                    src={listing.imageUrls[0]} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/CCCCCC/333333?text=Image+Unavailable';
                    }}
                />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Donor Details</h3>
                <p className="text-sm text-gray-700">
                    <span className="font-medium">Donated By:</span> {listing.user.firstName} {listing.user.lastName}
                </p>
                <p className="text-sm text-gray-700 mb-4">
                    <span className="font-medium">Located In:</span> {listing.city} {listing.zipCode ? `(${listing.zipCode})` : ''}
                </p>
                
                {isOwner ? (
                    <div className="space-y-3">
                        <Link 
                            href={`/listings/${listingId}/edit`}
                            className="w-full block text-center bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Edit Listing
                        </Link>

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-red-300"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Listing'}
                        </button>
                    </div>
                ) : (
                    <button
                        className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        onClick={() => alert(`Contact Donor at: ${listing.user.email}`)}
                    >
                        Contact Donor
                    </button>
                )}
            </div>
        </div>
        
        {/* Right Column: Details */}
        <div className="md:w-1/2 pt-6 md:pt-0">
            <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
                    {listing.category}
                </span>
                {getStatusBadge(listing.status)}
            </div>
            
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                {listing.title}
            </h1>

            {/* Donation / Tax Value Section */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800 uppercase font-semibold tracking-wide">
                    Estimated Tax Receipt Value
                </p>
                <p className="text-3xl font-extrabold text-green-700">
                    {taxValue}
                </p>
                {listing.isValuated && (
                    <span className="text-xs text-green-600 flex items-center mt-1">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        Professionally Valuated
                    </span>
                )}
            </div>

            {/* Original Bill Price Display */}
            <div className="mb-6 text-sm text-gray-500">
                <p>Original Bill Price: <span className="font-medium text-gray-800">${listing.originalPrice?.toFixed(2)}</span></p>
                <p>Condition: <span className="font-medium text-gray-800 capitalize">{listing.condition.replace('_', ' ')}</span></p>
                <p>Purchased: <span className="font-medium text-gray-800">{listing.purchaseYear}</span></p>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2 border-b pb-1">
                Description
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap mb-6">
                {listing.description}
            </p>

            <p className="text-sm text-gray-500 mt-4">
                Posted {timeAgo(listing.createdAt)}
            </p>
        </div>
      </div>
    </div>
  );
}