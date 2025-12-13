// File: app/components/FloatingInbox.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function FloatingInbox() {
  const { status } = useSession();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const checkUnread = async () => {
      try {
        const res = await fetch(
          `/api/messages?unreadCount=true&ts=${Date.now()}`
        );
        const data = await res.json();
        if (res.ok) {
          // Just check if count is greater than 0
          setHasUnread(data.count > 0);
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <Link
      href="/messages"
      className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center border-2 border-white group"
      aria-label="Messages"
    >
      {/* Simple Red Dot Notification */}
      {hasUnread && (
        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-white bg-red-500 " />
      )}

      {/* Chat Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    </Link>
  );
}
