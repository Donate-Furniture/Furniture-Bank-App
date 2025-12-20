'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link'; // ✅ Added Link import
import ListingCard from '@/app/components/ListingCard';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('approvals');
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  
  // New States
  const [users, setUsers] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedUser, setSelectedUser] = useState<any>(null); // For User Detail View

  // User Detail Sub-states
  const [userDetailTab, setUserDetailTab] = useState('listings');
  const [subData, setSubData] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subPagination, setSubPagination] = useState({ total: 0, totalPages: 1 });

  // Security Check
  useEffect(() => {
    // 1. Do nothing while NextAuth is loading the session
    if (status === 'loading') return;

    // 2. If not signed in, go to Login page
    if (status === 'unauthenticated') {
        router.push('/auth');
    } 
    // 3. If signed in, check Role
    else if (status === 'authenticated') {
        // @ts-ignore
        if (session?.user?.role !== 'ADMIN') {
            router.push('/'); // Redirect non-admins to Home
        }
    }
  }, [status, session, router]); // ✅ Added session to dependencies for accurate checking

  // Fetch Data based on Tab
  useEffect(() => {
    // Only fetch if we are actually an admin (prevents API calls before redirect)
    // @ts-ignore
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
        if (activeTab === 'approvals') fetchPending();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'all_listings') fetchAllListings();
    }
  }, [activeTab, page, search, status, session]); // Re-fetch on filter change

  // Fetch Logic
  const fetchPending = () => {
      fetch('/api/admin/pending').then(res => res.json()).then(data => setPendingListings(data.listings || []));
  };
  
  const fetchUsers = () => {
      fetch(`/api/admin/users?page=${page}&limit=10&search=${search}`)
        .then(res => res.json())
        .then(data => {
            setUsers(data.users || []);
            setPagination(data.pagination || { total: 0, totalPages: 1 });
        });
  };

  const fetchAllListings = () => {
      fetch(`/api/admin/listings/all?page=${page}&limit=10&search=${search}`)
        .then(res => res.json())
        .then(data => {
            setAllListings(data.listings || []);
            setPagination(data.pagination || { total: 0, totalPages: 1 });
        });
  };

  // Fetch User Details (Drill-down)
  useEffect(() => {
    if (selectedUser) {
        fetch(`/api/admin/users/${selectedUser.id}?type=${userDetailTab}&page=${subPage}`)
            .then(res => res.json())
            .then(data => {
                setSubData(data.data || []);
                setSubPagination(data.pagination || { total: 0, totalPages: 1 });
            });
    }
  }, [selectedUser, userDetailTab, subPage]);


  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/approve/${id}`, { method: 'PUT' });
    fetchPending();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
    // Trigger useEffect
  };

  if (status === 'loading') return <p className="p-10 text-center">Loading...</p>;
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return null;

  // --- USER DETAIL VIEW (Modal-ish) ---
  if (selectedUser) {
      return (
          <div className="max-w-7xl mx-auto p-6">
              <button onClick={() => setSelectedUser(null)} className="mb-4 text-indigo-600 hover:underline">&larr; Back to Users</button>
              <h1 className="text-3xl font-bold mb-2">{selectedUser.firstName} {selectedUser.lastName}</h1>
              <p className="text-gray-500 mb-6">{selectedUser.email} • {selectedUser.role} • {selectedUser.city || 'No City'}</p>
              
              <div className="flex border-b mb-4">
                  <button onClick={() => {setUserDetailTab('listings'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'listings' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Listings</button>
                  <button onClick={() => {setUserDetailTab('messages'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'messages' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Messages</button>
              </div>

              <div className="space-y-4">
                  {subData.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded bg-white shadow-sm hover:shadow-md transition-shadow">
                          {userDetailTab === 'listings' ? (
                              // ✅ FIX: Whole row is a link
                              <Link href={`/listings/${item.id}`} className="block">
                                  <div className="flex justify-between items-center">
                                      <div>
                                        <h3 className="font-bold text-indigo-600">{item.title}</h3>
                                        <p className="text-sm text-gray-500">Status: {item.status} | Price: {item.originalPrice}</p>
                                      </div>
                                      <span className="text-gray-400">&rarr;</span>
                                  </div>
                              </Link>
                          ) : (
                              <>
                                <p className="text-sm"><span className="font-bold">Message:</span> {item.content}</p>
                                <p className="text-xs text-gray-500">From: {item.sender?.email} To: {item.recipient?.email}</p>
                              </>
                          )}
                      </div>
                  ))}
              </div>
              
               {/* Sub Pagination */}
               <div className="flex gap-2 mt-6">
                  <button disabled={subPage <= 1} onClick={() => setSubPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <span>Page {subPage} of {subPagination.totalPages}</span>
                  <button disabled={subPage >= subPagination.totalPages} onClick={() => setSubPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
          </div>
      )
  }

  // --- MAIN DASHBOARD ---
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 space-x-6">
        {['approvals', 'users', 'all_listings', 'analytics'].map(tab => (
            <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); setSearch(''); }}
                className={`py-2 px-1 font-medium capitalize ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {tab.replace('_', ' ')}
            </button>
        ))}
      </div>

      {/* Search Bar (For Users & Listings) */}
      {(activeTab === 'users' || activeTab === 'all_listings') && (
          <form className="mb-6 flex gap-2" onSubmit={handleSearch}>
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                className="border p-2 rounded w-full md:w-1/3"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Search</button>
          </form>
      )}

      {/* TAB 1: APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
            {pendingListings.length === 0 && <p>No pending approvals.</p>}
            {pendingListings.map(l => (
                <div key={l.id} className="flex justify-between items-center p-4 bg-white border rounded shadow-sm">
                    <div>
                        <h3 className="font-bold">{l.title}</h3>
                        <p className="text-sm text-gray-500">By: {l.user.firstName}</p>
                    </div>
                    <button onClick={() => handleApprove(l.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Approve</button>
                </div>
            ))}
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
            {users.map(u => (
                <div 
                    key={u.id} 
                    onClick={() => setSelectedUser(u)}
                    className="flex justify-between items-center p-4 bg-white border rounded shadow-sm cursor-pointer hover:bg-gray-50"
                >
                    <div>
                        <h3 className="font-bold">{u.firstName} {u.lastName}</h3>
                        <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <div className="text-right text-sm">
                        <span className="block font-medium text-indigo-600">{u._count?.listings || 0} Listings</span>
                        <span className="text-gray-400">View Details &rarr;</span>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* TAB 3: ALL LISTINGS */}
      {activeTab === 'all_listings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allListings.map(l => (
                 <div key={l.id} className="relative group">
                    <ListingCard listing={l} />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Status: {l.status} | Approved: {l.isApproved ? 'Yes' : 'No'}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Pagination Controls */}
      {(activeTab === 'users' || activeTab === 'all_listings') && (
          <div className="flex justify-center gap-4 mt-8">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border rounded disabled:opacity-50">Prev</button>
              <span className="py-2">Page {page} of {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
      )}
    </div>
  );
}