'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import MyListings from '@/app/components/MyListings';

export default function ProfilePage() {
    
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    console.log('user.createdAt:', user?.createdAt);
    // Protection Check: Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
        router.push('/auth');
        return null; 
    }

    if (isLoading || !user) return <p className="text-center p-10">Loading profile data...</p>;
    
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
                        <span className="font-medium">Name:</span> {user.firstName} {user.lastName}
                    </p>
                    <p>
                        <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p>
                        <span className="font-medium">Location:</span> {user.location || 'Not set'}
                    </p>
                    <p>
                        <span className="font-medium">Member Since:</span> {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* My Listings Section (Component to be created) */}
            <div className="mt-10">
                <MyListings /> 
            </div>
        </div>
    );
}