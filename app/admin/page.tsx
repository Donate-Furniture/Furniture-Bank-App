// File: app/admin/page.tsx
'use client';

// ... (Imports remain the same)
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/app/components/ListingCard';

export default function AdminDashboard() {
  // ... (State definitions remain the same)
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('approvals');
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]); // Added reports state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedUser, setSelectedUser] = useState<any>(null); 
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'USER', city: '' });
  const [userDetailTab, setUserDetailTab] = useState('listings');
  const [subData, setSubData] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subPagination, setSubPagination] = useState({ total: 0, totalPages: 1 });

  // ... (useEffects remain the same) ...
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
    // @ts-ignore
    else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  useEffect(() => {
    // @ts-ignore
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
        if (activeTab === 'approvals') fetchPending();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'all_listings') fetchAllListings();
        if (activeTab === 'reports') fetchReports();
    }
  }, [activeTab, page, search, status, session]);

  const fetchPending = () => fetch('/api/admin/pending').then(res => res.json()).then(data => setPendingListings(data.listings || []));
  const fetchUsers = () => {
      fetch(`/api/admin/users?page=${page}&limit=10&search=${search}`)
        .then(res => res.json())
        .then(data => { setUsers(data.users || []); setPagination(data.pagination || { total: 0, totalPages: 1 }); });
  };
  const fetchAllListings = () => {
      fetch(`/api/admin/listings/all?page=${page}&limit=10&search=${search}`)
        .then(res => res.json())
        .then(data => { setAllListings(data.listings || []); setPagination(data.pagination || { total: 0, totalPages: 1 }); });
  };
  const fetchReports = () => {
      fetch('/api/admin/reports').then(res => res.json()).then(data => setReports(data.reports || []));
  };
  
  useEffect(() => {
    if (selectedUser) {
        fetch(`/api/admin/users/${selectedUser.id}?type=${userDetailTab}&page=${subPage}`)
            .then(res => res.json())
            .then(data => { setSubData(data.data || []); setSubPagination(data.pagination || { total: 0, totalPages: 1 }); });
    }
  }, [selectedUser, userDetailTab, subPage]);

  // --- Handlers ---
  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/approve/${id}`, { method: 'PUT' });
    fetchPending();
  };

  const toggleListingVisibility = async (id: string, currentApprovalStatus: boolean) => {
    // ✅ ADDED: Confirmation
    const action = currentApprovalStatus ? 'Hide' : 'Show';
    if (!confirm(`Are you sure you want to ${action} this listing?`)) return;
    try {
        const res = await fetch(`/api/admin/approve/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isApproved: !currentApprovalStatus })
        });
        if (res.ok) fetchAllListings();
    } catch (e) { console.error(e); }
  };

  const handleUpdateReport = async (id: string, newStatus: string) => {
    await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
    });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  const getSearchPlaceholder = () => {
    if (activeTab === 'users') return 'Search by name, email, phone...';
    if (activeTab === 'all_listings') return 'Search by title, city...';
    return 'Search...';
  };

  const toggleBlockUser = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    // ✅ ADDED: Confirmation
    const action = currentStatus ? 'Unblock' : 'Block';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBlocked: !currentStatus })
        });
        if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const openAddUserModal = () => {
      setUserFormData({ firstName: '', lastName: '', email: '', password: '', role: 'USER', city: '' });
      setIsUserModalOpen(true);
  };

  const deleteUser = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // ✅ ADDED: Confirmation
      if (!confirm('Are you sure you want to delete this user? This will delete ALL their data and cannot be undone.')) return;
      try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (res.ok) fetchUsers();
      } catch (err) { console.error(err); }
  };

  const saveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const url = '/api/admin/users';
          const method = 'POST';
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userFormData) });
          if (!res.ok) throw new Error('Failed to save');
          setIsUserModalOpen(false); fetchUsers();
          alert('User created');
      } catch (err: any) { alert(err.message); }
  };

  if (status === 'loading') return <p className="p-10 text-center">Loading...</p>;
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return null;

  // --- SUB-VIEW: USER DRILL DOWN ---
  if (selectedUser) {
      return (
          <div className="max-w-7xl mx-auto p-6">
              <button onClick={() => setSelectedUser(null)} className="mb-4 text-indigo-600 hover:underline">&larr; Back to Users</button>
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        {selectedUser.firstName} {selectedUser.lastName}
                        {selectedUser.isBlocked && <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded">BLOCKED</span>}
                    </h1>
                    <p className="text-gray-500 mb-6">{selectedUser.email} • {selectedUser.role}</p>
                 </div>
                 <button 
                    onClick={(e) => toggleBlockUser(selectedUser.id, selectedUser.isBlocked, e)}
                    className={`px-4 py-2 rounded font-medium border shadow-sm transition-colors ${
                        selectedUser.isBlocked 
                        ? 'bg-green-600 text-white border-transparent hover:bg-green-700' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                    }`}
                 >
                    {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                 </button>
              </div>
              
              <div className="flex border-b mb-4">
                  <button onClick={() => {setUserDetailTab('listings'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'listings' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Listings</button>
                  <button onClick={() => {setUserDetailTab('messages'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'messages' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Messages</button>
              </div>

              <div className="space-y-4">
                  {subData.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded bg-white shadow-sm hover:shadow-md transition-shadow">
                          {userDetailTab === 'listings' ? (
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
                              <><p className="text-sm"><span className="font-bold">Message:</span> {item.content}</p><p className="text-xs text-gray-500">From: {item.sender?.email} To: {item.recipient?.email}</p></>
                          )}
                      </div>
                  ))}
              </div>
              
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
    <div className="max-w-7xl mx-auto p-6 lg:p-8 relative">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 space-x-6">
        {['approvals', 'users', 'all_listings', 'analytics', 'reports'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); setSearch(''); }} className={`py-2 px-1 font-medium capitalize ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab.replace('_', ' ')}</button>
        ))}
      </div>

      {(activeTab === 'users' || activeTab === 'all_listings') && (
          <div className="mb-6 flex justify-between items-center">
             <form className="flex gap-2 w-full md:w-1/2" onSubmit={handleSearch}>
                <input type="text" placeholder={getSearchPlaceholder()} className="border p-2 rounded w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Search</button>
             </form>
             {activeTab === 'users' && (
                 <button onClick={openAddUserModal} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">+ Add User</button>
             )}
          </div>
      )}

      {/* TAB 1: APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
            {pendingListings.length === 0 && <p>No pending approvals.</p>}
            {pendingListings.map(l => (
                <div key={l.id} className="flex justify-between items-center p-4 bg-white border rounded shadow-sm">
                    <div><h3 className="font-bold">{l.title}</h3><p className="text-sm text-gray-500">By: {l.user.firstName}</p></div>
                    {/* ✅ ADDED: Confirmation to Approve */}
                    <button onClick={() => { if(confirm('Approve this listing?')) handleApprove(l.id) }} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Approve</button>
                </div>
            ))}
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
            {users.map(u => (
                <div key={u.id} onClick={() => setSelectedUser(u)} className="flex justify-between items-center p-4 bg-white border rounded shadow-sm cursor-pointer hover:bg-gray-50">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            {u.firstName} {u.lastName}
                            {u.role === 'ADMIN' && <span className="bg-black text-white text-xs px-2 rounded uppercase">ADMIN</span>}
                            {u.isBlocked && <span className="bg-red-100 text-red-800 text-xs px-2 rounded uppercase">BLOCKED</span>}
                        </h3>
                        <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => toggleBlockUser(u.id, u.isBlocked, e)} className={`text-sm font-medium px-3 py-1 rounded border ${u.isBlocked ? 'border-gray-300 text-gray-600 hover:bg-gray-100' : 'border-yellow-200 text-yellow-700 hover:bg-yellow-100'}`}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                        <button onClick={(e) => deleteUser(u.id, e)} className="text-red-600 hover:underline text-sm font-medium px-3">Delete</button>
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
                    <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                         {/* ✅ Hide/Show Button */}
                         <button 
                            onClick={(e) => {
                                e.preventDefault();
                                toggleListingVisibility(l.id, l.isApproved);
                            }}
                            className={`text-xs px-2 py-1 rounded font-bold shadow text-white ${l.isApproved ? 'bg-gray-800 hover:bg-gray-900' : 'bg-green-600 hover:bg-green-700'}`}
                         >
                             {l.isApproved ? 'Hide' : 'Show'}
                         </button>
                         {/* Status Badge */}
                         <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {l.status}
                         </span>
                    </div>
                </div>
            ))}
        </div>
      )}
      
      {/* TAB 4: ANALYTICS (Placeholder as requested in earlier steps, hidden for brevity here but state exists) */}
      
      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && (
          <div className="space-y-4">
              {reports.length === 0 ? (
                  <p className="text-gray-500 text-center py-10 bg-gray-50 rounded border border-dashed">No reports found.</p>
              ) : (
                  reports.map(r => (
                    <div key={r.id} className="p-4 bg-white border rounded shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-red-600">Report: {r.reason}</h3>
                                <p className="text-sm text-gray-700 mt-1">{r.details}</p>
                                {/* ... Details ... */}
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {r.status}
                                </span>
                                {r.status === 'pending' && (
                                    <div className="mt-2 flex flex-col gap-2">
                                        <button onClick={() => handleUpdateReport(r.id, 'resolved')} className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">Mark Resolved</button>
                                        <button onClick={() => handleUpdateReport(r.id, 'dismissed')} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100">Dismiss</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
              )}
          </div>
      )}

      {/* PAGINATION */}
      {(activeTab === 'users' || activeTab === 'all_listings') && (
          <div className="flex justify-center gap-4 mt-8">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border rounded disabled:opacity-50">Prev</button>
              <span className="py-2">Page {page} of {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
      )}

      {/* --- ADD USER MODAL --- */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                  {/* ... Form content ... */}
                   <form onSubmit={saveUser} className="space-y-4">
                      {/* ... inputs ... */}
                      {/* ... buttons ... */}
                        <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create</button>
                      </div>
                   </form>
              </div>
          </div>
      )}
    </div>
  );
}