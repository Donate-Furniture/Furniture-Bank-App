// Admin Dashboard: Central hub for managing users, listings, approvals, and reports.
// Now includes "Edit" functionality for both Users and Listings via modal dialogs.

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/app/components/ListingCard';
import EditUserModal from '@/app/components/EditUserModal';
import EditListingModal from '@/app/components/EditListingModal';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState('overview'); // Default: Work Overview
  const [search, setSearch] = useState('');
  
  // --- Analytics Filter ---
  const [analyticsYear, setAnalyticsYear] = useState('all'); // 'all' or '2025', '2024' etc.

  // --- Data State ---
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  // --- Analytics Data ---
  const [analytics, setAnalytics] = useState({
    totalPostedValue: 0,
    totalDonatedValue: 0,
    availableListingsCount: 0,
    donatedListingsCount: 0,
    topDonors: [] as any[],
    topTakers: [] as any[]
  });
  
  // --- Pagination ---
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  
  // --- Edit Modal State ---
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingListing, setEditingListing] = useState<any>(null);

  // --- Drill-down State (Selected User) ---
  const [selectedUser, setSelectedUser] = useState<any>(null); 
  const [userDetailTab, setUserDetailTab] = useState('listings');
  const [subData, setSubData] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subPagination, setSubPagination] = useState({ total: 0, totalPages: 1 });

  // 1. Auth Guard
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
    // @ts-ignore
    else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  // 2. Data Fetcher
  useEffect(() => {
    // @ts-ignore
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
        if (activeTab === 'overview') fetchOverviewData();
        if (activeTab === 'analytics') fetchAnalyticsData();
        if (activeTab === 'approvals') fetchPending();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'all_listings') fetchAllListings();
        if (activeTab === 'reports') fetchReports();
    }
  }, [activeTab, page, search, status, session, analyticsYear]); // Re-fetch analytics when year changes

  // 3. Sub-Data Fetcher
  useEffect(() => {
    if (selectedUser) {
        fetch(`/api/admin/users/${selectedUser.id}?type=${userDetailTab}&page=${subPage}`)
            .then(res => res.json())
            .then(data => { setSubData(data.data || []); setSubPagination(data.pagination || { total: 0, totalPages: 1 }); });
    }
  }, [selectedUser, userDetailTab, subPage]);

  // --- API Helpers ---
  
  const fetchOverviewData = async () => {
      // Fetches just the work items (Pending & Reports)
      fetchPending();
      fetchReports();
  };

  const fetchAnalyticsData = async () => {
      try {
          const res = await fetch(`/api/admin/analytics?year=${analyticsYear}`, { cache: 'no-store' });
          const data = await res.json();
          if (res.ok) {
              // ✅ SAFE UPDATE: Ensure arrays exist even if API returns incomplete data
              setAnalytics(prev => ({
                  ...prev,
                  ...data,
                  topDonors: data.topDonors || [],
                  topTakers: data.topTakers || []
              }));
          }
      } catch (e) {
          console.error("Analytics fetch failed", e);
      }
  };

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
  const fetchReports = () => fetch('/api/admin/reports').then(res => res.json()).then(data => setReports(data.reports || []));
  
  // --- Handlers ---
  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/approve/${id}`, { method: 'PUT' });
    fetchPending();
  };

  const toggleListingVisibility = async (id: string, currentApprovalStatus: boolean) => {
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

  const toggleBlockUser = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const deleteUser = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this user? This will delete ALL their data and cannot be undone.')) return;
      try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (res.ok) fetchUsers();
      } catch (err) { console.error(err); }
  };

  const handleResolveReport = async (reportId: string) => {
      if(!confirm("Are you sure you want to mark this report as resolved? It will be removed from the list.")) return;
      
      try {
          const res = await fetch(`/api/admin/reports`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: reportId }) 
          });
          
          if (res.ok) {
              fetchReports();
          } else {
              alert("Failed to resolve report.");
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  // Helper for Currency Formatting
  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  // --- Render ---
  if (status === 'loading') return <p className="p-10 text-center">Loading...</p>;
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return null;

  // View: Single User Details
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
                    <p className="text-gray-500 mb-6">{selectedUser.email}</p>
                 </div>
              </div>
              
              <div className="flex border-b mb-4">
                  <button onClick={() => {setUserDetailTab('listings'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'listings' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Listings</button>
                  <button onClick={() => {setUserDetailTab('messages'); setSubPage(1)}} className={`px-4 py-2 ${userDetailTab === 'messages' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Messages</button>
              </div>

              <div className="space-y-4">
                  {subData.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded bg-white shadow-sm">
                          {userDetailTab === 'listings' ? (
                              <div className="flex justify-between items-center">
                                  <div>
                                    <h3 className="font-bold text-indigo-600">{item.title}</h3>
                                    <p className="text-sm text-gray-500">Status: {item.status} | Price: {item.originalPrice}</p>
                                  </div>
                              </div>
                          ) : (
                              <><p className="text-sm"><span className="font-bold">Message:</span> {item.content}</p><p className="text-xs text-gray-500">From: {item.sender?.email} To: {item.recipient?.email}</p></>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 relative">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 space-x-6 overflow-x-auto">
        {['overview', 'analytics', 'approvals', 'users', 'all_listings', 'reports'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); setSearch(''); }} className={`py-2 px-1 font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Search Bar (Only for tables that support it) */}
      {(activeTab === 'users' || activeTab === 'all_listings') && (
          <div className="mb-6 flex gap-2">
             <form className="flex gap-2 w-full md:w-1/2" onSubmit={handleSearch}>
                <input type="text" placeholder="Search..." className="border p-2 rounded w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Search</button>
             </form>
          </div>
      )}

      {/* TAB 0: OVERVIEW (Work Items) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700">Action Required</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pending Approval Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200 bg-orange-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-orange-800 uppercase tracking-wider">Pending Listings</h3>
                        <p className="text-4xl font-bold text-orange-600 mt-2">{pendingListings.length}</p>
                        <p className="text-xs text-orange-700 mt-1">Items waiting for approval</p>
                    </div>
                    <button 
                        onClick={() => setActiveTab('approvals')} 
                        className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-semibold"
                    >
                        Review Queue &rarr;
                    </button>
                </div>
                
                {/* Active Reports Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 bg-red-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-red-800 uppercase tracking-wider">Active Reports</h3>
                        <p className="text-4xl font-bold text-red-600 mt-2">{reports.length}</p>
                        <p className="text-xs text-red-700 mt-1">User issues needing attention</p>
                    </div>
                    <button 
                        onClick={() => setActiveTab('reports')} 
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold"
                    >
                        Resolve Issues &rarr;
                    </button>
                </div>
            </div>
            
            <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Admin Tips:</h3>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    <li>Check "Pending Listings" daily to ensure quick turnaround for users.</li>
                    <li>Resolve Reports promptly to maintain community safety.</li>
                    <li>Use the "Analytics" tab to see platform growth and financial impact.</li>
                </ul>
            </div>
        </div>
      )}

      {/* TAB 1: ANALYTICS (Metrics) */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
            
            {/* Filter Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Platform Analytics</h2>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Time Period:</label>
                    <select 
                        value={analyticsYear} 
                        onChange={(e) => setAnalyticsYear(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Time</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                    </select>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Posted Value */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value Posted</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.totalPostedValue)}</p>
                </div>
                {/* Donated Value */}
                <div className="bg-white p-6 rounded-xl border shadow-sm border-green-100 bg-green-50">
                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider">Total Value Donated</h3>
                    <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(analytics.totalDonatedValue)}</p>
                </div>
                 {/* Available Count */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Listings</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.availableListingsCount}</p>
                </div>
                 {/* Donated Count */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Donated Listings</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.donatedListingsCount}</p>
                </div>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Donors */}
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-800">🏆 Top Donors</h3>
                        <p className="text-xs text-gray-500 mt-1">Users with most listings in this period</p>
                    </div>
                    <div className="divide-y">
                        {/* ✅ FIX: Optional chaining used here to prevent runtime crash */}
                        {analytics.topDonors?.length === 0 && <p className="p-6 text-gray-500 text-center">No data available.</p>}
                        {analytics.topDonors?.map((user: any, idx) => (
                            <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg text-indigo-600">{user._count?.listings || 0}</span>
                                    <span className="text-xs text-gray-500">Items</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Takers */}
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-800">🎁 Top Recipients</h3>
                        <p className="text-xs text-gray-500 mt-1">Users with most items received in this period</p>
                    </div>
                    <div className="divide-y">
                        {/* ✅ FIX: Optional chaining used here as well */}
                        {analytics.topTakers?.length === 0 && <p className="p-6 text-gray-500 text-center">No data available.</p>}
                        {analytics.topTakers?.map((user: any, idx) => (
                            <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg text-green-600">{user._count?.receivedListings || 0}</span>
                                    <span className="text-xs text-gray-500">Items</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TAB 2: APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
            {pendingListings.length === 0 && <p>No pending approvals.</p>}
            {pendingListings.map(l => (
                <div key={l.id} className="flex justify-between items-center p-4 bg-white border rounded shadow-sm">
                    <div><h3 className="font-bold">{l.title}</h3><p className="text-sm text-gray-500">By: {l.user.firstName}</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingListing(l)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200">Edit</button>
                        <button onClick={() => { if(confirm('Approve this listing?')) handleApprove(l.id) }} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Approve</button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
            {users.map(u => (
                <div key={u.id} className="flex justify-between items-center p-4 bg-white border rounded shadow-sm hover:bg-gray-50">
                    <div onClick={() => setSelectedUser(u)} className="cursor-pointer flex-1">
                        <h3 className="font-bold flex items-center gap-2">
                            {u.firstName} {u.lastName}
                            {u.isBlocked && <span className="bg-red-100 text-red-800 text-xs px-2 rounded uppercase">BLOCKED</span>}
                        </h3>
                        <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setEditingUser(u); }} className="text-sm font-medium px-3 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50">Edit</button>
                        <button onClick={(e) => toggleBlockUser(u.id, u.isBlocked, e)} className={`text-sm font-medium px-3 py-1 rounded border ${u.isBlocked ? 'border-gray-300 text-gray-600 hover:bg-gray-100' : 'border-yellow-200 text-yellow-700 hover:bg-yellow-100'}`}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                        <button onClick={(e) => deleteUser(u.id, e)} className="text-red-600 hover:underline text-sm font-medium px-3">Delete</button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* TAB 4: ALL LISTINGS */}
      {activeTab === 'all_listings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allListings.map(l => (
                  <div key={l.id} className="relative group">
                    <ListingCard listing={l} />
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-2 z-10">
                          <button 
                            onClick={(e) => { e.preventDefault(); toggleListingVisibility(l.id, l.isApproved); }}
                            className={`text-xs px-2 py-1 rounded font-bold shadow text-white ${l.isApproved ? 'bg-gray-800 hover:bg-gray-900' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                             {l.isApproved ? 'Hide' : 'Show'}
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); setEditingListing(l); }}
                            className="text-xs px-2 py-1 rounded font-bold shadow text-white bg-blue-600 hover:bg-blue-700"
                          >
                             Edit
                          </button>
                    </div>
                </div>
            ))}
        </div>
      )}
      
      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
            {reports.length === 0 && <p className="text-gray-500 text-center py-10">No reports found.</p>}
            {reports.map((report: any) => (
                <div key={report.id} className="p-4 bg-white border rounded shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <h3 className="font-bold text-red-600 uppercase text-xs tracking-wider mb-1">
                                {report.reason}
                            </h3>
                            <p className="text-gray-800 mb-3 bg-gray-50 p-2 rounded">{report.details || "No details provided."}</p>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                                <p className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">Reported By:</span> 
                                    {report.reporter?.firstName} {report.reporter?.lastName} 
                                    <span className="text-gray-400">({report.reporter?.email})</span>
                                </p>
                                
                                {report.reportedUser && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">Target User:</span>
                                        <button 
                                            onClick={() => setSelectedUser(report.reportedUser)} 
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            {report.reportedUser.firstName} {report.reportedUser.lastName} ({report.reportedUser.email})
                                        </button>
                                    </div>
                                )}
                                
                                {report.reportedListing && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">Target Listing:</span>
                                        <Link 
                                            href={`/listings/${report.reportedListing.id}`} 
                                            target="_blank"
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            {report.reportedListing.title} (ID: {report.reportedListing.id})
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                            
                            {/* Resolve Button */}
                            <button
                                onClick={() => handleResolveReport(report.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 shadow-sm whitespace-nowrap"
                            >
                                Mark Resolved
                            </button>
                        </div>
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

      {/* --- MODALS --- */}
      {editingUser && (
          <EditUserModal 
            user={editingUser} 
            isOpen={!!editingUser} 
            onClose={() => setEditingUser(null)} 
            onSave={fetchUsers} 
          />
      )}

      {editingListing && (
          <EditListingModal 
            listing={editingListing} 
            isOpen={!!editingListing} 
            onClose={() => setEditingListing(null)} 
            onSave={() => { fetchAllListings(); fetchPending(); fetchAnalyticsData(); }} 
          />
      )}
    </div>
  );
}