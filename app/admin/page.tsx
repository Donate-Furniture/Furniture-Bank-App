'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ListingCard from '@/app/components/ListingCard'; // Reusing your card
import { Listing } from '@/lib/types';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<any>(null); // Placeholder for stats
  const [activeTab, setActiveTab] = useState('approvals');

  // 1. Security Check
  useEffect(() => {
    if (status === 'authenticated') {
        // @ts-ignore
        if (session?.user?.role !== 'ADMIN') {
            router.push('/'); // Kick out non-admins
        }
    } else if (status === 'unauthenticated') {
        router.push('/auth');
    }
  }, [status, session, router]);

  // 2. Fetch Pending Listings
  useEffect(() => {
    if (activeTab === 'approvals') {
        fetch('/api/admin/pending')
            .then(res => res.json())
            .then(data => setPendingListings(data.listings || []));
    } else if (activeTab === 'analytics') {
         fetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data));
    }
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/approve/${id}`, { method: 'PUT' });
    setPendingListings(prev => prev.filter(l => l.id !== id)); // Remove from list
  };

  const handleReject = async (id: string) => {
      if(!confirm("Are you sure you want to reject and delete this listing?")) return;
      await fetch(`/api/listings/${id}`, { method: 'DELETE' }); // Reuse delete API
      setPendingListings(prev => prev.filter(l => l.id !== id));
  };

  if (status === 'loading') return <p className="p-10 text-center">Checking permissions...</p>;
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return null; // Prevent flash of content

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button 
            onClick={() => setActiveTab('approvals')}
            className={`py-2 px-4 font-medium ${activeTab === 'approvals' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Pending Approvals ({pendingListings.length})
        </button>
        <button 
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-4 font-medium ${activeTab === 'analytics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Analytics & Stats
        </button>
      </div>

      {/* --- TAB CONTENT: APPROVALS --- */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
            {pendingListings.length === 0 ? (
                <p className="text-gray-500">No pending listings.</p>
            ) : (
                pendingListings.map(listing => (
                    <div key={listing.id} className="flex gap-6 items-start bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        {/* Reusing ListingCard for preview, but you might want a smaller version */}
                        <div className="w-64 flex-shrink-0">
                            <ListingCard listing={listing} />
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="text-xl font-bold">{listing.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">Posted by: {listing.user.firstName} {listing.user.lastName} ({listing.user.email})</p>
                            <p className="text-gray-700 mb-4">{listing.description}</p>
                            
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => handleApprove(listing.id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Approve Listing
                                </button>
                                <button 
                                    onClick={() => handleReject(listing.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                >
                                    Reject & Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}

      {/* --- TAB CONTENT: ANALYTICS --- */}
      {activeTab === 'analytics' && stats && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Top Donors */}
             <div className="bg-white p-6 rounded-xl shadow-sm border">
                 <h3 className="text-lg font-bold mb-4">Top 5 Donors (By Listing Count)</h3>
                 <ul className="space-y-3">
                     {stats.topDonors.map((donor: any, i: number) => (
                         <li key={i} className="flex justify-between border-b pb-2">
                             <span>{donor.firstName} {donor.lastName}</span>
                             <span className="font-bold">{donor._count.listings} items</span>
                         </li>
                     ))}
                 </ul>
             </div>

             {/* Total Stats */}
             <div className="bg-white p-6 rounded-xl shadow-sm border">
                 <h3 className="text-lg font-bold mb-4">Platform Overview</h3>
                 <div className="space-y-2">
                     <p>Total Listings: <span className="font-bold">{stats.totalListings}</span></p>
                     <p>Total Users: <span className="font-bold">{stats.totalUsers}</span></p>
                     <p>Total Value Donated (Estimated): <span className="font-bold text-green-600">${stats.totalValue.toFixed(2)}</span></p>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
}