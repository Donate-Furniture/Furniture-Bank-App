// File: app/profile/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MyListings from '@/app/components/MyListings';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

export default function ProfilePage() {
    //Use useSession hook
    const { data: session, status } = useSession();
    const router = useRouter();

    // Loading State
    if (status === 'loading') {
        return <p className="text-center p-10">Loading profile data...</p>;
    }

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
        router.push('/auth');
        return null; 
    }

    const user = session?.user;

    return (
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <h1 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-2">
                My Profile Dashboard
            </h1>

            {/* Profile Overview Card */}
            <div className="bg-white p-6 shadow-xl rounded-xl border border-indigo-100 mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-indigo-600">
                    Account Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    <p>
                        {/* Use type assertion (as any) to access custom fields we added to the session */}
                        <span className="font-medium">Name:</span> {(user as any)?.firstName} {(user as any)?.lastName || user?.name}
                    </p>
                    <p>
                        <span className="font-medium">Email:</span> {user?.email}
                    </p>
                    <p>
                        <span className="font-medium">City:</span> {(user as any)?.city || 'Not set'}
                    </p>
                    <p>
                        <span className="font-medium">Member Since:</span> {formatDate((user as any)?.createdAt)}
                    </p>
                </div>
            </div>

            {/* My Listings Section */}
            <div className="mt-10">
                <MyListings /> 
            </div>
        </div>
    );
}