// File: app/listings/[id]/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation'; 
import Link from 'next/link';
import { Listing } from '@/lib/types'; 
import { useSession } from 'next-auth/react'; 
import ChatWindow from '@/app/components/ChatWindow';

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

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'available': return <span className="text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-800">Available</span>;
        case 'on_hold': return <span className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">On Hold</span>;
        case 'donated': return <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-600">Donated</span>;
        default: return <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
};

// Main Content Component (Inner)
function ListingContent() {
  const params = useParams(); 
  const listingId = params.id as string;
  const searchParams = useSearchParams(); // Hook works best inside Suspense
  
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ✅ FIX: Initialize state directly from URL params
  // This ensures the chat is open on the very first render if the URL says so
  const initialChatWith = searchParams.get('chatWith');
  const initialRecipientName = searchParams.get('recipientName');

  const [showChat, setShowChat] = useState(!!initialChatWith);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(initialChatWith);
  const [chatRecipientName, setChatRecipientName] = useState<string>(initialRecipientName || 'User');

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Listing could not be loaded.');
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
        const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        alert('Listing deleted successfully');
        router.push('/profile'); 
    } catch (error) {
        alert('Error deleting listing');
        setIsDeleting(false);
    }
  };

  const handleStartChat = () => {
    if (!user) {
        router.push('/auth');
        return;
    }
    // Default to chatting with the owner
    if (listing) {
        setChatRecipientId(listing.user.id);
        setChatRecipientName(`${listing.user.firstName} ${listing.user.lastName}`);
        setShowChat(true);
    }
  };

  if (isLoading) return <p className="text-center p-10">Loading Listing Details...</p>;
  if (error) return <p className="text-center p-10 text-red-600">Error: {error}</p>;
  if (!listing) return <p className="text-center p-10">Listing Not Found (404)</p>;

  // Check if logged-in user is the owner
  const isOwner = user && (user as any).id === listing.user.id;
  
  const donorFullName = `${listing.user.firstName} ${listing.user.lastName}`;
  const taxValue = listing.estimatedValue !== null ? `$${listing.estimatedValue.toFixed(2)}` : 'Pending';

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 bg-white shadow-lg rounded-xl my-10">
      
      <Link href="/" className="text-indigo-600 hover:underline mb-4 inline-block">
        &larr; Back to Listings
      </Link>
      
      <div className="md:flex md:space-x-8">
        
        {/* Left Column */}
        <div className="md:w-1/2 space-y-6">
            
            {showChat && chatRecipientId ? (
                <div>
                     <button onClick={() => setShowChat(false)} className="mb-2 text-sm text-gray-500 hover:text-indigo-600 flex items-center">
                        &larr; Back to item info
                     </button>
                     <ChatWindow 
                        recipientId={chatRecipientId} 
                        recipientName={chatRecipientName} 
                        listingId={listingId}
                     />
                </div>
            ) : (
                <>
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="bg-gray-200 rounded-lg overflow-hidden shadow-md h-64 md:h-80 relative">
                            <img 
                                src={listing.imageUrls[selectedImageIndex]} 
                                alt={listing.title} 
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/CCCCCC/333333?text=No+Image'; }}
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {selectedImageIndex + 1} / {listing.imageUrls.length}
                            </div>
                        </div>
                        {listing.imageUrls.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {listing.imageUrls.map((url, index) => (
                                    <button key={index} onClick={() => setSelectedImageIndex(index)} className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${selectedImageIndex === index ? 'border-indigo-600' : 'border-transparent'}`}>
                                        <img src={url} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                
                    {/* Donor Info / Controls */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold mb-2">Donor Details</h3>
                        <p className="text-sm text-gray-700"><span className="font-medium">Donated By:</span> {donorFullName}</p>
                        <p className="text-sm text-gray-700 mb-4"><span className="font-medium">Location:</span> {listing.city}</p>
                        
                        {isOwner ? (
                            <div className="space-y-3">
                                {/* 1. Edit Button */}
                                <Link 
                                    href={`/listings/${listingId}/edit`} 
                                    className="w-full block text-center bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
                                >
                                    Edit Listing
                                </Link>
                                
                                {/* 2. Message Controls for Owner */}
                                {chatRecipientId ? (
                                    <button 
                                        onClick={() => setShowChat(true)}
                                        className="w-full block text-center bg-white border border-indigo-600 text-indigo-600 py-2 rounded-md hover:bg-indigo-50 font-medium"
                                    >
                                        Reply to {chatRecipientName}
                                    </button>
                                ) : (
                                    <Link 
                                        href="/messages" 
                                        className="w-full block text-center bg-white border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 font-medium"
                                    >
                                        Check Inbox
                                    </Link>
                                )}

                                {/* 3. Delete Button */}
                                <button onClick={handleDelete} disabled={isDeleting} className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:bg-red-300">
                                    {isDeleting ? 'Deleting...' : 'Delete Listing'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartChat}
                                className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                {user ? 'Contact Donor' : 'Log In to Contact'}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
        
        {/* Right Column: Details (Same as before) */}
        <div className="md:w-1/2 pt-6 md:pt-0">
             <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">{listing.category}</span>
                {getStatusBadge(listing.status)}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{listing.title}</h1>
            
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800 uppercase font-semibold">Estimated Tax Value</p>
                <p className="text-3xl font-extrabold text-green-700">{taxValue}</p>
                {listing.isValuated && <span className="text-xs text-green-600 block mt-1">✓ Professionally Valuated</span>}
            </div>

            <div className="mb-6 text-sm text-gray-500 space-y-1">
                <p>Original Bill: <span className="font-medium text-gray-800">${listing.originalPrice?.toFixed(2)}</span></p>
                <p>Condition: <span className="font-medium text-gray-800 capitalize">{listing.condition.replace('_', ' ')}</span></p>
                <p className="mt-2 font-medium text-red-600">Pickup Deadline: {new Date(listing.collectionDeadline).toLocaleDateString()}</p>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2 border-b pb-1">Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap mb-6">{listing.description}</p>
            <p className="text-sm text-gray-500 mt-4">Posted {timeAgo(listing.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ✅ WRAPPER COMPONENT: Handles the Suspense Boundary required for useSearchParams
export default function ListingDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading page...</div>}>
      <ListingContent />
    </Suspense>
  );
}