// File: app/components/ChatWindow.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface ChatWindowProps {
    recipientId: string;
    recipientName: string;
    listingId?: string; 
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
}

export default function ChatWindow({ recipientId, recipientName, listingId }: ChatWindowProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const currentUserId = (session?.user as any)?.id;

    // Function to mark messages as read
    const markAsRead = async () => {
        try {
            await fetch('/api/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: recipientId }) 
            });
        } catch (e) {
            console.error('Failed to mark read', e);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/messages?userId=${recipientId}&ts=${Date.now()}`);
            const data = await res.json();
            if (res.ok) {
                // Optimization: Only update state if data actually changed
                setMessages(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data.messages)) {
                        return prev;
                    }
                    return data.messages;
                });
                
                // ✅ NEW: Mark read every time we fetch successfully
                markAsRead();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Load & Polling
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [recipientId]);

    // Scroll Logic
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempContent = newMessage;
        setNewMessage(''); 

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId,
                    content: tempContent,
                    listingId
                })
            });

            if (res.ok) {
                fetchMessages(); 
            } else {
                alert('Failed to send');
                setNewMessage(tempContent); 
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col h-[500px] border border-gray-200 rounded-xl bg-white shadow-md">
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="font-semibold text-gray-800">Chat with {recipientName}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <p className="text-center text-gray-400 text-sm">Loading history...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm">Start the conversation!</p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div 
                                    className={`max-w-[70%] p-3 rounded-lg text-sm ${
                                        isMe 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </form>
        </div>
    );
}