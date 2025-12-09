// File: app/listings/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react'; 
import { useRouter, useParams } from 'next/navigation';
import { Listing } from '@/lib/types';

const MAIN_CATEGORIES = ['Furniture', 'Vehicles', 'Books', 'Antique'];
const CURRENT_YEAR = new Date().getFullYear();

const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
};

// Helper function to format DateTime string to YYYY-MM-DD for date input
const toDateInputString = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
        // Ensure date is treated as UTC to prevent local timezone shifting the day
        return new Date(dateString).toISOString().split('T')[0];
    } catch {
        return '';
    }
};

export default function EditListingPage() {
  const { data: session, status } = useSession(); 
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const user = session?.user;

  // Form State - Only track editable fields + context data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    zipCode: '',
    status: 'available',
    collectionDeadline: '', // Initialized with empty string
  });

  // Keep read-only data separate
  const [readOnlyData, setReadOnlyData] = useState<{
    category: string;
    subCategory: string | null;
    estimatedValue: number | null;
    originalPrice: number;
    // Add deadline here for initial formatting
    collectionDeadline: string; 
  } | null>(null);

  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch the existing listing data
  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch listing');

        const listing: Listing = data.listing;

        // Security Check
        if (user && (user as any).id !== listing.user.id) {
            router.push('/');
            return;
        }

        // Set Editable Fields
        setFormData({
            title: listing.title,
            description: listing.description,
            city: listing.city,
            zipCode: listing.zipCode || '',
            status: listing.status,
            // ✅ FIX: Format the date string for the input
            collectionDeadline: toDateInputString(listing.collectionDeadline), 
        });

        // Set Read-Only Context
        setReadOnlyData({
            category: listing.category,
            subCategory: listing.subCategory,
            estimatedValue: listing.estimatedValue,
            originalPrice: listing.originalPrice,
            collectionDeadline: listing.collectionDeadline,
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    if (status === 'authenticated') {
        fetchListing();
    } else if (status === 'unauthenticated') {
        router.push('/auth');
    }
  }, [listingId, status, user, router]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Display backend validation error if the date is too soon
        if (data.error) {
            setError(data.error);
        } else {
             throw new Error('Failed to update listing');
        }
        
      } else {
        router.push(`/listings/${listingId}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching || status === 'loading') return <p className="text-center p-10">Loading listing data...</p>;

  const formattedValue = readOnlyData?.estimatedValue ? `$${readOnlyData.estimatedValue.toFixed(2)}` : 'Pending';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Listing</h1>
        <p className="text-sm text-gray-500 mt-1">Update the details of your donation.</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* --- READ ONLY CONTEXT --- */}
      <div className="bg-blue-50 p-4 rounded-md mb-6 flex justify-between items-center text-sm text-blue-800">
        <div>
            <span className="font-semibold">Category:</span> {readOnlyData?.category} 
            {readOnlyData?.subCategory && ` (${readOnlyData.subCategory})`}
        </div>
        <div className="text-right">
            <div className="font-semibold">Original Bill: ${readOnlyData?.originalPrice.toFixed(2)}</div>
            <div className="font-bold text-green-700">
                Tax Value: {formattedValue}
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Status (Top priority for editing) */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select 
                name="status" 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                value={formData.status} 
                onChange={handleChange}
            >
                <option value="available">Available</option>
                <option value="on_hold">On Hold (Reserved)</option>
                <option value="donated">Donated (Completed)</option>
            </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input 
            name="title" 
            type="text" 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
            value={formData.title} 
            onChange={handleChange} 
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea 
            name="description" 
            required 
            rows={6} 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
            value={formData.description} 
            onChange={handleChange} 
          />
        </div>

        {/* Location & Deadline Row */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input 
                name="city" 
                type="text" 
                required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                value={formData.city} 
                onChange={handleChange} 
            />
          </div>
          <div className="w-1/2">
            {/* ✅ EDITABLE DEADLINE FIELD */}
            <label className="block text-sm font-medium text-gray-700">Latest Collection Date</label>
            <input 
                name="collectionDeadline" 
                type="date" 
                required 
                min={getMinDate()} // UI min date enforcement
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                value={formData.collectionDeadline} 
                onChange={handleChange} 
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 1 week from today.</p>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button 
                type="button" 
                onClick={() => router.back()} 
                className="w-1/3 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
                Cancel
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-2/3 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
            >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
      </form>
    </div>
  );
}