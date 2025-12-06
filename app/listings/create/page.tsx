// File: app/listings/create/page.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react'; // ✅ Switch to NextAuth
import { useRouter } from 'next/navigation';

const MAIN_CATEGORIES = ['Furniture', 'Vehicles', 'Books', 'Antique'];
const CURRENT_YEAR = new Date().getFullYear();

export default function CreateListingPage() {
  // ✅ Use useSession instead of useAuth
  const { status } = useSession(); 
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: MAIN_CATEGORIES[0], 
    subCategory: '', 
    
    // Algorithm Fields
    originalPrice: '',
    purchaseYear: CURRENT_YEAR.toString(),
    condition: 'like_new', // Default

    city: '',
    zipCode: '',
    isValuated: false, 
    valuationPrice: '', 
    imageUrls: ['https://placehold.co/600x400?text=Furniture+Item'], 
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading check
  if (status === 'loading') {
    return <p className="text-center p-10">Loading...</p>;
  }

  // Protect the route: Redirect if not logged in
  if (status === 'unauthenticated') {
    router.push('/auth');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleValuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isValuated: e.target.checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Pre-validation for the $650 rule
    if (parseFloat(formData.originalPrice) > 650 && !formData.isValuated) {
        setError("Items with a bill price over $650 require a professional valuation.");
        setIsSubmitting(false);
        return;
    }

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ REMOVED: Authorization header. NextAuth cookies handle this automatically now.
        },
        body: JSON.stringify(formData), 
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing');

      alert('Listing created! Value calculated.');
      router.push('/');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Post a New Item</h1>
      
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

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
                    {MAIN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                <input name="subCategory" type="text" required placeholder="e.g. Victorian Desk" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.subCategory} onChange={handleChange} />
            </div>
        </div>

        {/* --- PRICING ALGORITHM INPUTS --- */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Value Calculator Details</h3>
            
            <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Original Bill Price ($)</label>
                    <input name="originalPrice" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.originalPrice} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Year Bought</label>
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
                    Has Professional Valuation? <span className="text-xs text-gray-500">(Required if bill price {'>'} $650)</span>
                </label>
            </div>

            {formData.isValuated && (
                <div>
                    <label className="block text-sm font-medium text-indigo-700">Appraised Value ($)</label>
                    <input name="valuationPrice" type="number" placeholder="Enter amount" className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md shadow-sm" value={formData.valuationPrice} onChange={handleChange} required={formData.isValuated} />
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

        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400">
          {isSubmitting ? 'Calculate & Create Listing' : 'Calculate & Create Listing'}
        </button>
      </form>
    </div>
  );
}