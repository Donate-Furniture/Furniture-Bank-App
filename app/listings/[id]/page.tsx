// File: app/listings/[id]/page.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation'; 
import Link from 'next/link';
import { useSession } from 'next-auth/react'; 
import ChatWindow from '@/app/components/ChatWindow';
import { Listing } from '@/lib/types'; 
import ReportModal from '@/app/components/ReportModal'; 

// --- SVG ICONS ---
const ArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const EditIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const Trash2 = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const Clock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const MapPin = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CheckCircle2 = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const MessageSquare = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const UserIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const TagIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const ChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

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

function ListingContent() {
  const params = useParams(); 
  const listingId = params.id as string;
  const searchParams = useSearchParams(); 
  const router = useRouter();
  
  const { data: session } = useSession();
  const user = session?.user;

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const initialChatWith = searchParams.get('chatWith');
  const initialRecipientName = searchParams.get('recipientName');
  const [showChat, setShowChat] = useState(!!initialChatWith);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(initialChatWith);
  const [chatRecipientName, setChatRecipientName] = useState<string>(initialRecipientName || 'User');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

  useEffect(() => {
    const chatWith = searchParams.get('chatWith');
    const recipientName = searchParams.get('recipientName');
    if (chatWith && listing) {
        setChatRecipientId(chatWith);
        setChatRecipientName(recipientName || 'User');
        setShowChat(true);
    }
  }, [searchParams, listing]);

  const handleDelete = async () => {
    // ✅ ADDED: Confirmation dialog
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    
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
    if (!user) { router.push('/auth'); return; }
    if (listing) {
        setChatRecipientId(listing.user.id);
        setChatRecipientName(`${listing.user.firstName} ${listing.user.lastName}`);
        setShowChat(true);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading...</p></div>;
  if (error || !listing) return <div className="p-10 text-center text-red-500">Error loading listing</div>;

  // @ts-ignore
  const isOwner = user && user.id === listing.user.id;
  // @ts-ignore
  const isAdmin = user?.role === 'ADMIN';
  
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;
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
                     <button onClick={() => setShowChat(false)} className="mb-2 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-2 font-medium">
                        <ArrowLeft /> Back to item info
                     </button>
                     <ChatWindow recipientId={chatRecipientId} recipientName={chatRecipientName} listingId={listing.id} />
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
                
                    {/* Donor Info */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                        <div className="flex items-center gap-4 mb-2">
                           <UserIcon />
                           <div><h3 className="text-lg font-bold">Donor Information</h3><p>{donorFullName}</p></div>
                        </div>
                        <div className="space-y-2 py-2 border-y border-gray-100">
                             <p className="text-sm flex justify-between"><span className="text-gray-500">Location:</span> <span className="font-semibold">{listing.city}, {listing.zipCode || 'BC'}</span></p>
                        </div>

                        {canDelete ? (
                            <div className="grid grid-cols-1 gap-3">
                                {canEdit && (
                                    <Link href={`/listings/${listing.id}/edit`} className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold">
                                        <EditIcon /> Edit Listing
                                    </Link>
                                )}
                                
                                {isOwner && (
                                    chatRecipientId ? (
                                        <button onClick={() => setShowChat(true)} className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-600 text-indigo-600 py-2.5 rounded-lg hover:bg-indigo-50 font-bold">
                                            <MessageSquare /> Reply to {chatRecipientName}
                                        </button>
                                    ) : (
                                        <Link href="/messages" className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-bold">Check Inbox</Link>
                                    )
                                )}

                                <button onClick={handleDelete} disabled={isDeleting} className="flex items-center justify-center gap-2 w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-lg hover:bg-red-50 font-bold">
                                    <Trash2 /> {isDeleting ? 'Deleting...' : 'Delete Listing'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button onClick={handleStartChat} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md">
                                  <MessageSquare /> Contact Donor
                                </button>
                                {user && (
                                    <button onClick={() => setIsReportModalOpen(true)} className="w-full text-center text-xs text-gray-400 hover:text-red-500 hover:underline mt-2 transition-colors">
                                        Report this listing
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
          </div>

          {/* Right Column (Item Details) */}
          <div className="md:w-1/2 p-6 md:p-10 border-l border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><TagIcon /> {listing.category}</span>
                {getStatusBadge(listing.status)}
             </div>
             <h1 className="text-3xl font-black">{listing.title}</h1>
             
             <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800 uppercase font-bold">Estimated Tax Receipt Value*</p>
                <p className="text-3xl font-extrabold text-green-700">{taxValue}</p>
                {listing.isValuated && <span className="text-xs text-green-600 block mt-1"><CheckCircle2 /> Professionally Valuated</span>}
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs font-bold text-gray-400">Condition</p><p className="font-bold capitalize">{listing.condition.replace('_', ' ')}</p></div>
                 {listing.category !== 'Antique' && (
                     <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs font-bold text-gray-400">Original Price</p><p className="font-bold">${listing.originalPrice?.toFixed(2)}</p></div>
                 )}
                 <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-center">
                     <Clock />
                     <div><p className="text-xs text-red-500 font-bold">Deadline</p><p className="font-extrabold text-red-700">{new Date(listing.collectionDeadline).toLocaleDateString()}</p></div>
                 </div>
             </div>

             <p className="text-gray-600 whitespace-pre-wrap mb-6">{listing.description}</p>
             <p className="text-sm text-gray-500 mt-4">Posted {timeAgo(listing.createdAt)}</p>
             <p className="text-xs text-gray-400 italic mt-8 border-t pt-2">* Automated estimate based on standard depreciation.</p>
          </div>
        </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)}
        listingId={listing.id}
        title="Report Listing"
      />
    </div>
  );
}

export default function ListingDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading page...</div>}>
      <ListingContent />
    </Suspense>
  );
}