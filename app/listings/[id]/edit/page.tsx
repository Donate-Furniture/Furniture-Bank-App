// File: app/listings/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { Listing } from '@/lib/types';

export default function EditListingPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    city: '',
    zipCode: '',
    status: 'available', // Added status for editing
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

        // Security Check: Ensure the user owns this listing
        // Note: The backend will also check this, but we check here for UX
        if (user && listing.user.id !== user.id) {
            router.push('/'); // Redirect unauthorized users
            return;
        }

        // Pre-fill the form
        setFormData({
            title: listing.title,
            description: listing.description,
            category: listing.category,
            price: listing.price ? listing.price.toString() : '',
            city: listing.city,
            zipCode: listing.zipCode || '',
            status: 'available', // You might want to fetch status from DB if you added it to schema
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
        // If done loading and not authenticated, redirect
        router.push('/auth');
    }
  }, [listingId, token, isAuthenticated, isLoading, user, router]);


  // 2. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Handle Update Submission (PUT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT', // <-- Using PUT for updates
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

      // Redirect back to the detail page to see changes
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
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            name="title"
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
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
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="Furniture">General Furniture</option>
            <option value="Sofa">Sofa</option>
            <option value="Table">Table</option>
            <option value="Chair">Chair</option>
            <option value="Bed">Bed</option>
          </select>
        </div>

        {/* Price & Location Row */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Price ($)</label>
            <input
              name="price"
              type="number"
              placeholder="0 for Free/Trade"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              name="city"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={formData.city}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
            <button
                type="button"
                onClick={() => router.back()} // Cancel button
                className="w-1/3 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
            >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
        </div>
      </form>
    </div>
  );
}