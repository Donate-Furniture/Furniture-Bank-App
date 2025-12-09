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
    
    condition: 'new', 

    city: '', zipCode: '', 
    isValuated: false, valuationPrice: '', 
    collectionDeadline: '',
    imageUrls: [] as string[],
    receiptUrl: '',
  });

  const [liveEstimate, setLiveEstimate] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LIVE CALCULATION EFFECT ---
  useEffect(() => {
    const price = parseFloat(formData.originalPrice);
    const year = parseInt(formData.purchaseYear);
    
    if (isNaN(price) || isNaN(year)) {
        setLiveEstimate(null);
        return;
    }

    // 1. Valuation Override
    if (formData.isValuated && formData.valuationPrice) {
        setLiveEstimate(parseFloat(formData.valuationPrice));
        return;
    }

    // 2. Minimum Value Rule
    if (price < 20) {
        setLiveEstimate(0);
        return;
    }

    // 3. Algorithm Logic
    
    // If Condition is 'new', No Depreciation.
    if (formData.condition === 'new') {
        setLiveEstimate(price);
        return;
    }

    // Otherwise, apply standard depreciation for 'used_like_new' and 'used'
    const age = CURRENT_YEAR - year;
    let value = 0;
    if (age <= 1) value = price * 0.60;
    else if (age <= 2) value = price * 0.50;
    else value = price * 0.34;

    // Extra penalty for 'used'
    if (formData.condition === 'used') {
        value = value * 0.50;
    }

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

  const handleItemImageAdd = (url: string) => {
    setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, url] }));
  };
  const handleItemImageRemove = (url: string) => {
    setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter(u => u !== url) }));
  };
  const handleReceiptAdd = (url: string) => {
    setFormData(prev => ({ ...prev, receiptUrl: url }));
  };
  const handleReceiptRemove = () => {
    setFormData(prev => ({ ...prev, receiptUrl: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (formData.imageUrls.length < 4) {
        setError("Minimum 4 item photos required.");
        setIsSubmitting(false);
        return;
    }

    if (parseFloat(formData.originalPrice) > 650 && !formData.isValuated) {
        setError("Items > $650 require professional valuation.");
        setIsSubmitting(false);
        return;
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
        
        {/* Photos */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Photos</h3>
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Item Photos (Min 4)</label>
                    {parseFloat(formData.originalPrice) > 650 && (
                        <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded">High Value Item: Add more photos!</span>
                    )}
                </div>
                <ImageUpload value={formData.imageUrls} onUpload={handleItemImageAdd} onRemove={handleItemImageRemove} />
                <p className="text-xs text-gray-500 mt-2">{formData.imageUrls.length} / 4 required uploaded.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt / Proof of Value (Optional)</label>
                <ImageUpload value={formData.receiptUrl ? [formData.receiptUrl] : []} onUpload={handleReceiptAdd} onRemove={handleReceiptRemove} />
            </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input name="title" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.title} onChange={handleChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.description} onChange={handleChange} />
            </div>
            <div className="flex gap-4">
                <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select name="category" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.category} onChange={handleChange}>
                        {MAIN_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                    <input name="subCategory" type="text" required placeholder="e.g. Victorian Desk" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.subCategory} onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* Value Calculator */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 space-y-4 relative">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Value Calculator</h3>
                <div className="group relative flex justify-center">
                    <button type="button" className="text-blue-500 hover:text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                    </button>
                    <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs rounded p-3 shadow-lg z-10">
                        <strong>Pricing Logic:</strong><br/>
                        New: Full Value<br/>
                        Like New: Age depreciation<br/>
                        Used: Age dep + 50% off<br/>
                        Items {'>'} $650 need appraisal.
                    </div>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Original Bill ($)</label>
                    <input name="originalPrice" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.originalPrice} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Year Bought</label>
                    <input name="purchaseYear" type="number" min="1900" max={CURRENT_YEAR} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.purchaseYear} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <select name="condition" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.condition} onChange={handleChange}>
                        {/* Updated Options */}
                        <option value="new">New</option>
                        <option value="used_like_new">Used Like New</option>
                        <option value="used">Used</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Estimated Tax Value:</span>
                <span className="text-2xl font-bold text-green-600">
                    {liveEstimate !== null ? `$${liveEstimate.toFixed(2)}` : '--'}
                </span>
            </div>
        </div>

        {/* Valuation */}
        <div className="space-y-4 py-2 border-t border-gray-100">
            <div className="flex items-center">
                <input id="isValuated" name="isValuated" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" checked={formData.isValuated} onChange={handleValuationChange} />
                <label htmlFor="isValuated" className="ml-2 block text-sm font-medium text-gray-700">
                    Has Professional Valuation? <span className="text-xs text-gray-500">(Required if bill price {'>'} $650)</span>
                </label>
            </div>
            {formData.isValuated && (
                <div>
                    <label className="block text-sm font-medium text-indigo-700">Appraised Value ($)</label>
                    <input name="valuationPrice" type="number" placeholder="Enter amount" className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md" value={formData.valuationPrice} onChange={handleChange} required={formData.isValuated} />
                </div>
            )}
        </div>

        {/* Logistics */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input name="city" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.city} onChange={handleChange} />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Latest Collection Date</label>
            <input name="collectionDeadline" type="date" required min={getMinDate()} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.collectionDeadline} onChange={handleChange} />
            <p className="text-xs text-gray-500 mt-1">Must be at least 1 week from today.</p>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400 transition-colors">
          {isSubmitting ? 'Submitting Donation...' : 'Post Donation'}
        </button>
      </form>
    </div>
  );
}