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
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);

  useEffect(() => {
    const price = parseFloat(formData.originalPrice);
    const year = parseInt(formData.purchaseYear);
    
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

  // OCR handler
  const handleAnalyzeReceiptPrice = async () => {
    if (formData.receiptUrl.length === 0) {
        setError('Please upload at least one receipt image before analyzing.');
        return;
    }

    setIsAnalyzingPrice(true);
    setError('');

    try {
        const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptUrl: formData.receiptUrl }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to analyze receipt.');
        }

        const extractedPrice = data.price.toFixed(2);
        
        // Update the form field
        setFormData(prev => ({ ...prev, originalPrice: extractedPrice.toString() }));
        alert(`Price detected: $${extractedPrice}. The 'Original Bill' field has been updated.`);

    } catch (err: any) {
        setError(err.message);
        alert(`OCR Error: ${err.message}`);
    } finally {
        setIsAnalyzingPrice(false);
    }
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

    if (parseFloat(formData.originalPrice) > 999 && formData.isValuated && formData.valuationDocUrl.length === 0) {
        setError("Please upload at least one valuation document.");
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
        
        {/* Photos & Documents Section */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Photos & Documents</h3>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Photos (Min 4)</label>
                <ImageUpload value={formData.imageUrls} {...createUploadHandlers('imageUrls')} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Receipts / Proofs (Optional)</label>
                    <ImageUpload value={formData.receiptUrl} {...createUploadHandlers('receiptUrl')} />
                    
                    {/* OCR Button */}
                    {formData.receiptUrl.length > 0 && (
                        <button 
                            type="button" 
                            onClick={handleAnalyzeReceiptPrice}
                            disabled={isAnalyzingPrice}
                            className="mt-3 w-full flex items-center justify-center py-2 px-4 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-70 transition"
                        >
                            {isAnalyzingPrice ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 16.5M10.5 14.25v2.25m2.25-4.5v4.5m-4.5-4.5v4.5M18 7.5v1.5m-3.75 3.75v3m0 0v1.5m0-1.5h-1.5m1.5 0h1.5m0-1.5v1.5m0 0h-1.5m1.5 0h1.5" />
                                </svg>
                            )}
                            {isAnalyzingPrice ? 'Analyzing...' : 'Analyze Receipt Price'}
                        </button>
                    )}
                </div>
                
                {formData.isValuated && (
                    <div>
                        <label className="block text-sm font-medium text-indigo-700 mb-2">Valuation Documents (Required)</label>
                        <ImageUpload value={formData.valuationDocUrl} {...createUploadHandlers('valuationDocUrl')} />
                    </div>
                )}
            </div>
        </div>

        {/* Value Calculator */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Value Calculator</h3>
            </div>
            
            <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Original Bill ($)</label>
                    <input 
                        name="originalPrice" 
                        type="number" 
                        required 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                        value={formData.originalPrice} 
                        onChange={handleChange} 
                    />
                </div>
                {/* ... (Purchase Year and Condition inputs remain the same) ... */}
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Year Bought</label>
                    <input name="purchaseYear" type="number" min="1900" max={CURRENT_YEAR} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.purchaseYear} onChange={handleChange} />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <select name="condition" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.condition} onChange={handleChange}>
                        <option value="new">New</option><option value="used_like_new">Used Like New</option><option value="used">Used</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 font-medium">Estimated Fair Market Value (FMV)*:</span>
                    <span className="text-2xl font-bold text-green-600">
                        {liveEstimate !== null ? `$${liveEstimate.toFixed(2)}` : '--'}
                    </span>
                </div>
                <p className="text-xs text-gray-500 italic">
                    *This is an estimate based on standard depreciation. The final tax receipt amount is determined by the registered charity accepting the donation.
                </p>
            </div>
        </div>
        {/* ... (Rest of Form: Valuation, Logistics, Submit) ... */}
         <div className="space-y-4 py-2 border-t border-gray-100">
            <div className="flex items-center">
                <input id="isValuated" name="isValuated" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" checked={formData.isValuated} onChange={handleValuationChange} />
                <label htmlFor="isValuated" className="ml-2 block text-sm font-medium text-gray-700">Has Professional Valuation?</label>
            </div>
            {formData.isValuated && (
                <div><input name="valuationPrice" type="number" className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md" value={formData.valuationPrice} onChange={handleChange} required={formData.isValuated} /></div>
            )}
        </div>

        <div className="flex gap-4">
          <input name="city" type="text" required className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md" value={formData.city} onChange={handleChange} />
          <input name="collectionDeadline" type="date" required min={getMinDate()} className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md" value={formData.collectionDeadline} onChange={handleChange} />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400">Post Donation</button>
      </form>
    </div>
  );
}