// Home page component for Furniture Exchange MVP
'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-6 text-indigo-600">
        Furniture Exchange MVP
      </h1>

      {user ? (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
          <div className="mb-4">
            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full uppercase font-semibold tracking-wide">
              Logged In
            </span>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome back, {user.firstName}!
          </h2>
          <p className="text-gray-500 mb-6">{user.email}</p>

          <button
            onClick={logout}
            className="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg text-gray-600 mb-4">
            Join the community to trade furniture securely.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth"
              className="bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Log In / Register
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}