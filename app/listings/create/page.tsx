// File: app/listings/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/app/components/ImageUpload';

const MAIN_CATEGORIES = ['Furniture', 'Vehicles', 'Books', 'Antique'];
const CURRENT_YEAR = new Date().getFullYear();

const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
};

export default function CreateListingPage() {
  const { status } = useSession(); 
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '', description: '', category: MAIN_CATEGORIES[0], subCategory: '', 
    originalPrice: '', purchaseYear: CURRENT_YEAR.toString(), 
    condition: 'new', city: '', zipCode: '', 
    isValuated: false, valuationPrice: '', collectionDeadline: '',
    imageUrls: [] as string[],
    receiptUrl: [] as string[],
    valuationDocUrl: [] as string[],
  });

  const [liveEstimate, setLiveEstimate] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic to determine if high value rule is triggered
  const isHighValue = parseFloat(formData.originalPrice) >= 1000;

  useEffect(() => {
    const price = parseFloat(formData.originalPrice);
    const year = parseInt(formData.purchaseYear);

    if (formData.category === 'Vehicles' && formData.condition === 'scrap') {
        setLiveEstimate(350);
        return;
    }
    
    if (isNaN(price) || isNaN(year)) { setLiveEstimate(null); return; }
    if (formData.isValuated && formData.valuationPrice) { setLiveEstimate(parseFloat(formData.valuationPrice)); return; }
    if (price < 20) { setLiveEstimate(0); return; }
    if (formData.condition === 'new') { setLiveEstimate(price); return; }

    const age = CURRENT_YEAR - year;
    let value = 0;
    if (age <= 1) value = price * 0.60;
    else if (age <= 2) value = price * 0.50;
    else value = price * 0.34;
    if (formData.condition === 'used') value = value * 0.50;
    setLiveEstimate(Math.round(value * 100) / 100);
  }, [formData.originalPrice, formData.purchaseYear, formData.condition, formData.isValuated, formData.valuationPrice]);

  if (status === 'loading') return <p className="text-center p-10">Loading...</p>;
  if (status === 'unauthenticated') { router.push('/auth'); return null; }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleValuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isValuated: e.target.checked });
  };

  const createUploadHandlers = (field: 'imageUrls' | 'receiptUrl' | 'valuationDocUrl') => ({
    onUpload: (url: string) => {
        setFormData(prev => ({ ...prev, [field]: [...prev[field], url] }));
    },
    onRemove: (url: string) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter(u => u !== url) }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (formData.imageUrls.length < 4) {
        setError("Minimum 4 item photos required.");
        setIsSubmitting(false);
        return;
    }

    if (isHighValue && (!formData.isValuated || formData.valuationDocUrl.length === 0)) {
        setError("High-value items ($1000+) require professional valuation and documentation.");
        setIsSubmitting(false);
        return;
    }

    // "Valuation Document required if Valuated"
    if (parseFloat(formData.originalPrice) > 999 && formData.isValuated && formData.valuationDocUrl.length === 0) {
        setError("Please upload at least one valuation document.");
        setIsSubmitting(false);
        return;
    }

    // "If not Antique, Estimated Value cannot exceed Original Price"
    if (formData.category !== 'Antique' && liveEstimate !== null) {
        if (liveEstimate > parseFloat(formData.originalPrice)) {
            setError("The appraised value cannot be higher than the original bill price.");
            setIsSubmitting(false);
            return;
        }
    }

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), 
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create listing');
      }

      alert('Listing created!');
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 mb-20">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Post a Donation</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-6 text-sm font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Item Photos (Top) */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Item Photos</h3>
            <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload at least 4 photos</label>
                <ImageUpload value={formData.imageUrls} {...createUploadHandlers('imageUrls')} />
                <p className="text-xs text-gray-500 mt-2">{formData.imageUrls.length} / 4 required.</p>
            </div>
        </div>

        {/* 2. Basic Details */}
        <div className="space-y-4">
             <div><label className="block text-sm font-medium text-gray-700">Title</label><input name="title" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.title} onChange={handleChange} /></div>
             <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea name="description" required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.description} onChange={handleChange} /></div>
             <div className="flex gap-4">
                <div className="w-1/2"><label className="block text-sm font-medium text-gray-700">Category</label><select name="category" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.category} onChange={handleChange}>{MAIN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="w-1/2"><label className="block text-sm font-medium text-gray-700">Sub Category</label><input name="subCategory" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.subCategory} onChange={handleChange} /></div>
            </div>
        </div>

        {/* 3. Value Calculator & Receipt */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 space-y-6">
             <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Value Calculator</h3>
             
             <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Original Bill ($)</label>
                    <input name="originalPrice" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.originalPrice} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Year Bought</label>
                    <input name="purchaseYear" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.purchaseYear} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <select name="condition" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.condition} onChange={handleChange}>
                        <option value="new">New</option>
                        <option value="used_like_new">Used Like New</option>
                        <option value="used">Used</option>
                        {formData.category === 'Vehicles' && (
                            <option value="scrap" className="font-bold text-red-600">Scrap (Value $350)</option>
                        )}
                    </select>
                </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 font-medium">Estimated Fair Market Value (FMV)*:</span>
                    <span className="text-2xl font-bold text-green-600">
                        {liveEstimate !== null ? `$${liveEstimate.toFixed(2)}` : '--'}
                    </span>
                </div>
                <p className="text-xs text-gray-500 italic">
                    *Estimate based on standard depreciation.
                </p>
            </div>

            {/* Receipt Upload Under Calculator */}
            <div className="border-t border-blue-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt / Proof of Value (Optional)</label>
                <ImageUpload value={formData.receiptUrl} {...createUploadHandlers('receiptUrl')} />
            </div>
        </div>

        {/* 4. Valuation Section */}
        {/*LOGIC: Turn background red if high value but not valuated */}
        <div className={`p-5 rounded-xl border transition-colors ${
            isHighValue && !formData.isValuated 
            ? 'bg-red-50 border-red-300 ring-2 ring-red-200' // Alert State
            : 'bg-gray-50 border-gray-200'
        }`}>
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input id="isValuated" name="isValuated" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" checked={formData.isValuated} onChange={handleValuationChange} />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="isValuated" className="font-medium text-gray-700">Has Professional Valuation?</label>
                    {isHighValue && (
                        <p className="text-red-600 font-bold mt-1">Required for items valued over $1000.</p>
                    )}
                </div>
            </div>

            {/* Valuation Upload inside this section */}
            {formData.isValuated && (
                <div className="mt-4 pl-7 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-700">Appraised Value ($)</label>
                        <input name="valuationPrice" type="number" placeholder="Enter amount" className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md" value={formData.valuationPrice} onChange={handleChange} required={formData.isValuated} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-700 mb-2">Upload Valuation Document (Required)</label>
                        <ImageUpload value={formData.valuationDocUrl} {...createUploadHandlers('valuationDocUrl')} />
                    </div>
                </div>
            )}
        </div>

        {/* 5. Logistics */}
        <div className="flex gap-4">
          <input name="city" type="text" placeholder="City" required className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md" value={formData.city} onChange={handleChange} />
          <input name="collectionDeadline" type="date" required min={getMinDate()} className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md" value={formData.collectionDeadline} onChange={handleChange} />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400">Post Donation</button>
      </form>
    </div>
  );
}