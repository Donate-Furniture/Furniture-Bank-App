// File: app/listings/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { Listing } from '@/lib/types';

// ✅ CHANGED: 'Cars' -> 'Vehicles'
const MAIN_CATEGORIES = ['Furniture', 'Vehicles', 'Books', 'Antique'];
const CURRENT_YEAR = new Date().getFullYear();

export default function EditListingPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  // Form State matching the NEW Schema
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    
    // Algorithm Fields
    originalPrice: '',
    purchaseYear: '',
    condition: 'like_new',
    
    // Valuation Fields
    isValuated: false,
    valuationPrice: '',
    
    city: '',
    zipCode: '',
    status: 'available',
    imageUrls: [] as string[], 
  });

  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch the existing listing data
  useEffect(() => {
    if (!listingId || !token) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch listing');

        const listing: Listing = data.listing;

        // Security Check
        if (user && listing.user.id !== user.id) {
            router.push('/');
            return;
        }

        // Pre-fill the form with NEW fields
        setFormData({
            title: listing.title,
            description: listing.description,
            category: listing.category,
            subCategory: listing.subCategory || '',
            
            originalPrice: listing.originalPrice.toString(),
            purchaseYear: listing.purchaseYear.toString(),
            condition: listing.condition,
            
            isValuated: listing.isValuated,
            valuationPrice: listing.valuationPrice ? listing.valuationPrice.toString() : '',
            
            city: listing.city,
            zipCode: listing.zipCode || '',
            status: listing.status,
            imageUrls: listing.imageUrls,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    if (isAuthenticated) {
        fetchListing();
    } else if (!isLoading) {
        router.push('/auth');
    }
  }, [listingId, token, isAuthenticated, isLoading, user, router]);


  // 2. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleValuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isValuated: e.target.checked });
  };

  // 3. Handle Update Submission (PUT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Logic: The Backend PUT route needs to be smart enough to re-calculate the value 
    // if the inputs change. We just send the raw data.

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update listing');
      }

      router.push(`/listings/${listingId}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching || isLoading) return <p className="text-center p-10">Loading listing data...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Edit Listing</h1>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input name="title" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.title} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" required rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.description} onChange={handleChange} />
        </div>

        {/* Categories */}
        <div className="flex gap-4">
            <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select name="category" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.category} onChange={handleChange}>
                    {/* Map the categories including the new 'Vehicles' */}
                    {MAIN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                <input name="subCategory" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.subCategory} onChange={handleChange} />
            </div>
        </div>

        {/* Status (Edit Page Specific) */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.status} onChange={handleChange}>
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold / Taken</option>
            </select>
        </div>

        {/* --- PRICING ALGORITHM INPUTS --- */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Value Data</h3>
            
            <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Bill Price ($)</label>
                    <input name="originalPrice" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.originalPrice} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Year</label>
                    <input name="purchaseYear" type="number" min="1900" max={CURRENT_YEAR} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.purchaseYear} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <select name="condition" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.condition} onChange={handleChange}>
                        <option value="like_new">Like New / Excellent</option>
                        <option value="well_used">Well Used</option>
                    </select>
                </div>
            </div>
        </div>

        {/* --- VALUATION SECTION --- */}
        <div className="space-y-4 py-2">
            <div className="flex items-center">
                <input id="isValuated" name="isValuated" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" checked={formData.isValuated} onChange={handleValuationChange} />
                <label htmlFor="isValuated" className="ml-2 block text-sm font-medium text-gray-700">
                    Has Professional Valuation?
                </label>
            </div>

            {formData.isValuated && (
                <div>
                    <label className="block text-sm font-medium text-indigo-700">Appraised Value ($)</label>
                    <input name="valuationPrice" type="number" className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm" value={formData.valuationPrice} onChange={handleChange} required={formData.isValuated} />
                </div>
            )}
        </div>

        {/* Location */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input name="city" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.city} onChange={handleChange} />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Zip Code</label>
            <input name="zipCode" type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.zipCode} onChange={handleChange} />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.back()} className="w-1/3 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400">
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
        </div>
      </form>
    </div>
  );
}