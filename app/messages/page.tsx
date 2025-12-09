// File: app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Conversation {
    user: {
        id: string;
        firstName: string;
        lastName: string;
    };
    lastMessage: string;
    date: string;
    listingTitle?: string;
    listingId?: string;
    listingImage?: string;
    isUnread?: boolean;
}

export default function InboxPage() {
    const { status } = useSession();
    const router = useRouter();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`/api/messages?ts=${Date.now()}`);
            const data = await res.json();
            
            if (res.ok) {
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Error loading inbox', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ NEW: Function to mark as read immediately
    const handleMarkAsRead = async (senderId: string) => {
        try {
            // Optimistically update UI (remove blue background immediately)
            setConversations(prev => prev.map(c => 
                c.user.id === senderId ? { ...c, isUnread: false } : c
            ));

            // Send request to backend
            await fetch('/api/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId })
            });
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth');
            return;
        }

        if (status === 'authenticated') {
            fetchConversations();
        }
    }, [status, router]);

    if (isLoading) return <p className="text-center p-10">Loading Inbox...</p>;

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-8 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">My Messages</h1>
                <button 
                    onClick={fetchConversations}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Refresh
                </button>
            </div>
            
            <p className="text-gray-500 mb-8">Select a conversation to continue chatting on the listing page.</p>

            <div className="space-y-4">
                {conversations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-lg text-gray-500">No messages yet.</p>
                        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
                            Browse listings to start chatting
                        </Link>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <Link 
                            key={conv.user.id + conv.date} 
                            href={conv.listingId ? `/listings/${conv.listingId}?chatWith=${conv.user.id}&recipientName=${encodeURIComponent(`${conv.user.firstName} ${conv.user.lastName}`)}` : '#'}
                            // ✅ TRIGGER: Mark read when clicked
                            onClick={(e) => {
                                if (!conv.listingId) {
                                    e.preventDefault();
                                    alert("This conversation is not linked to an active listing.");
                                    return;
                                }
                                // Fire and forget (don't await) so navigation is fast
                                handleMarkAsRead(conv.user.id);
                            }}
                            className={`block border rounded-xl p-4 transition-all group relative
                                ${conv.isUnread 
                                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:shadow-md'
                                }
                            `}
                        >
                            {conv.isUnread && (
                                <span className="absolute top-4 right-4 h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white"></span>
                            )}

                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                    {conv.listingImage ? (
                                        <img 
                                            src={conv.listingImage} 
                                            alt="Item" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image'; }} 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mr-6">
                                        <h3 className={`font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors ${conv.isUnread ? 'font-bold' : ''}`}>
                                            {conv.user.firstName} {conv.user.lastName}
                                        </h3>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                            {new Date(conv.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    {conv.listingTitle && (
                                        <p className="text-xs font-medium text-indigo-600 mb-1">
                                            Re: {conv.listingTitle}
                                        </p>
                                    )}
                                    
                                    <p className={`text-sm truncate ${conv.isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                        {conv.lastMessage}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}