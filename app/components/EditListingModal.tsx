// Admin Edit Listing Modal: Allows modification of listing details, price, and media (images/bills).
// Reuses the ImageUpload component for consistent file handling.

'use client';

import { useState } from 'react';
import ImageUpload from '@/app/components/ImageUpload';

interface EditListingModalProps {
    listing: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function EditListingModal({ listing, isOpen, onClose, onSave }: EditListingModalProps) {
    const [formData, setFormData] = useState({
        title: listing.title || '',
        description: listing.description || '',
        originalPrice: listing.originalPrice?.toString() || '',
        estimatedValue: listing.estimatedValue?.toString() || '',
        imageUrls: listing.imageUrls || [],
        receiptUrl: listing.receiptUrl || []
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/listings/${listing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('Listing updated successfully');
                onSave();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to update listing');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Helper for image uploaders
    const createUploadHandlers = (field: 'imageUrls' | 'receiptUrl') => ({
        onUpload: (url: string) => {
            // @ts-ignore
            setFormData(prev => ({ ...prev, [field]: [...prev[field], url] }));
        },
        onRemove: (url: string) => {
            // @ts-ignore
            setFormData(prev => ({ ...prev, [field]: prev[field].filter((u: string) => u !== url) }));
        }
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Edit Listing: {listing.title}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input name="title" value={formData.title} onChange={handleChange} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full border p-2 rounded" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Original Price ($)</label>
                            <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tax Value ($)</label>
                            <input type="number" name="estimatedValue" value={formData.estimatedValue} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50" disabled />
                            <p className="text-xs text-gray-500">Auto-calculated based on original price unless manually valuated.</p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Photos</label>
                        <ImageUpload value={formData.imageUrls} {...createUploadHandlers('imageUrls')} />
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Receipt / Bill Photos</label>
                        <ImageUpload value={formData.receiptUrl} {...createUploadHandlers('receiptUrl')} />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}