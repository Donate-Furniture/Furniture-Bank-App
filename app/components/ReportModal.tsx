// File: app/components/ReportModal.tsx
'use client';

import { useState } from 'react';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId?: string;
    targetUserId?: string;
    title: string; // "Report Listing" or "Report User"
}

export default function ReportModal({ isOpen, onClose, listingId, targetUserId, title }: ReportModalProps) {
    const [reason, setReason] = useState('Inappropriate Content');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Note: Ensure you have created app/api/reports/route.ts for this to work
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, details, listingId, targetUserId }),
            });

            if (res.ok) {
                alert('Report submitted. Thank you for helping keep our community safe.');
                onClose();
            } else {
                alert('Failed to submit report.');
            }
        } catch (error) {
            console.error(error);
            alert('Error submitting report.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <select 
                            className="w-full border rounded-md p-2"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            <option>Inappropriate Content</option>
                            <option>Scam / Fraud</option>
                            <option>Wrong Category</option>
                            <option>Harassment</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
                        <textarea 
                            className="w-full border rounded-md p-2"
                            rows={3}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Please provide more details..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}