// File: app/profile/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    phoneNumber: '',
    streetAddress: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current data
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth');
    if (status === 'authenticated') {
        fetch('/api/user/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setFormData({
                        phoneNumber: data.user.phoneNumber || '',
                        streetAddress: data.user.streetAddress || '',
                        city: data.user.city || '',
                        province: data.user.province || '',
                        postalCode: data.user.postalCode || '',
                    });
                }
            })
            .finally(() => setIsLoading(false));
    }
  }, [status, router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
        const res = await fetch('/api/user/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setMessage({ type: 'success', text: 'Profile information updated successfully.' });
        router.refresh(); // Refresh server components
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
        const res = await fetch('/api/user/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData, // Send existing data to avoid wiping it if logic isn't perfect (API handles partials, but safe habit)
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setMessage({ type: 'success', text: 'Password changed successfully.' });
        setPasswordData({ currentPassword: '', newPassword: '' }); // Clear fields
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
    }
  };

  if (isLoading) return <p className="p-10 text-center">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-8">
      <Link href="/profile" className="text-indigo-600 hover:underline mb-6 inline-block">&larr; Back to Profile</Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Profile</h1>

      {message && (
          <div className={`p-4 rounded-md mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
          </div>
      )}

      {/* --- FORM 1: CONTACT INFO --- */}
      <form onSubmit={handleProfileUpdate} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Contact Information</h2>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input 
                    type="text" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Street Address</label>
                <input 
                    type="text" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                />
            </div>
            <div className="flex gap-4">
                <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                </div>
                <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">Province</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={formData.province}
                        onChange={(e) => setFormData({...formData, province: e.target.value})}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                <input 
                    type="text" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                />
            </div>
        </div>

        <button type="submit" className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Save Contact Info
        </button>
      </form>

      {/* --- FORM 2: SECURITY --- */}
      <form onSubmit={handlePasswordUpdate} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Security</h2>
        <p className="text-sm text-gray-500 mb-4">Note: Social login users (Google/Facebook) cannot change passwords here.</p>

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input 
                    type="password" 
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input 
                    type="password" 
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                />
            </div>
        </div>

        <button type="submit" className="mt-6 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900">
            Change Password
        </button>
      </form>
    </div>
  );
}