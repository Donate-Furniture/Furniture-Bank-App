// Chat Window Component: Real-time messaging interface with auto-scrolling, polling for updates, and read-receipt logic.
// optimized to minimize re-renders and handle message history between two users.

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

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

export default function ChatWindow({
  recipientId,
  recipientName,
  listingId,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentUserId = (session?.user as any)?.id;

  // --- API: Mark Conversation as Read ---
  const markAsRead = async () => {
    try {
      await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: recipientId }),
      });
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  // --- API: Fetch & Sync Messages ---
  const fetchMessages = async () => {
    try {
      // Add timestamp to prevent caching
      const res = await fetch(
        `/api/messages?userId=${recipientId}&ts=${Date.now()}`
      );
      const data = await res.json();

      if (res.ok) {
        // Optimization: Only update state if the data actually changed (prevents flickering)
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.messages)) {
            return prev;
          }
          return data.messages;
        });

        // Trigger read status update if fetch was successful
        markAsRead();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lifecycle: Polling ---
  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds for new messages (Simulating real-time sockets)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [recipientId]);

  // --- UI Behavior: Auto-Scroll ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handler: Send Message ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Optimistic UI: Clear input immediately
    const tempContent = newMessage;
    setNewMessage("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          content: tempContent,
          listingId,
        }),
      });

      if (res.ok) {
        fetchMessages(); // Refresh immediately to show sent message
      } else {
        alert("Failed to send");
        setNewMessage(tempContent); // Revert on failure
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 rounded-xl bg-white shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
        <h3 className="font-semibold text-gray-800">
          Chat with {recipientName}
        </h3>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-400 text-sm">
            Loading history...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">
            Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg text-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-gray-100 flex gap-2"
      >
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
