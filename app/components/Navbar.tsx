// Navbar Component: The global top navigation bar.
// Dynamically adjusts UI based on authentication status (Guest vs User) and Role (Admin vs User).

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  // 1. Auth Hook: Reactive session state
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === "authenticated";
  const user = session?.user;

  // 2. Role Check: Safely determine if the current user is an Admin
  // The 'role' field is added to the session in app/api/auth/[...nextauth]/route.ts
  const isAdmin = (user as any)?.role === "ADMIN";

  const handleSignOut = async () => {
    // redirect: false allows us to manually control the navigation (e.g., to home)
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Home Link */}
          <Link
            href="/"
            className="flex-shrink-0 text-xl font-bold text-indigo-600"
          >
            Furniture MVP
          </Link>

          <div className="flex items-center space-x-4">
            {/* --- Authenticated State --- */}
            {isAuthenticated ? (
              <>
                {/* ✅ Admin Link: Only visible to admins */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}

                {/* Post Item CTA */}
                <Link
                  href="/listings/create"
                  className="bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Post Item
                </Link>

                {/* User Greeting */}
                <span className="text-gray-700 text-sm hidden sm:block">
                  Hi,{" "}
                  {(user as any)?.firstName ||
                    user?.name?.split(" ")[0] ||
                    "User"}
                </span>

                {/* Profile Link (Icon) */}
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="My Profile"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              /* --- Guest State --- */
              <Link
                href="/auth"
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
