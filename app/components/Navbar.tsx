// File: app/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    
                    {/* Logo/Home Link */}
                    <Link href="/" className="flex-shrink-0 text-xl font-bold text-indigo-600">
                        Home
                    </Link>

                    {/* Navigation and Auth Links */}
                    <div className="flex items-center space-x-4">
                        
                        {isAuthenticated && (
                            <>
                                {/* Link to Profile/Dashboard */}
                                <Link
                                    href="/profile"
                                    className="text-gray-600 hover:text-indigo-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Profile
                                </Link>
                                
                                {/* Link to Create Listing Page (Visible only when logged in) */}
                                <Link
                                    href="/listings/create"
                                    className="bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    Post Item
                                </Link>
                                <br></br>
                               
                                {/* Sign Out Button */}
                                <button
                                    onClick={handleSignOut}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}

                        {!isAuthenticated && (
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