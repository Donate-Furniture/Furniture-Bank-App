// Edit Listing Page: Allows users to modify donations.
// UPDATED: When marking item as "Donated", fetches chat history to let the user select the recipient.

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Listing } from "@/lib/types";

const MAIN_CATEGORIES = ["Furniture", "Vehicles", "Books", "Antique"];

const getMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

const toDateInputString = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

interface ChatUser {
    id: string;
    name: string;
}

export default function EditListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const user = session?.user;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    zipCode: "",
    status: "available",
    collectionDeadline: "",
    recipientId: "", // ✅ New field
  });

  const [readOnlyData, setReadOnlyData] = useState<any>(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ New State: Potential Recipients from Chat
  const [potentialRecipients, setPotentialRecipients] = useState<ChatUser[]>([]);

  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const listing: Listing = data.listing;

        // @ts-ignore
        if (user && user.id !== listing.user.id) {
          router.push("/");
          return;
        }

        setFormData({
          title: listing.title,
          description: listing.description,
          city: listing.city,
          zipCode: listing.zipCode || "",
          status: listing.status,
          collectionDeadline: toDateInputString(listing.collectionDeadline),
          // @ts-ignore
          recipientId: listing.recipient?.id || "",
        });

        setReadOnlyData({
          category: listing.category,
          subCategory: listing.subCategory,
          estimatedValue: listing.estimatedValue,
          originalPrice: listing.originalPrice,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    if (status === "authenticated") fetchListing();
    else if (status === "unauthenticated") router.push("/auth");
  }, [listingId, status, user, router]);

  // ✅ New: Fetch people who chatted about this item
  useEffect(() => {
      if (status === 'authenticated') {
          fetch('/api/messages') // Gets inbox
            .then(res => res.json())
            .then(data => {
                if (data.conversations) {
                    // Filter conversations relevant to this listing ID
                    const relevant = data.conversations
                        .filter((c: any) => c.listingId === listingId)
                        .map((c: any) => ({
                            id: c.user.id,
                            name: `${c.user.firstName} ${c.user.lastName}`
                        }));
                    setPotentialRecipients(relevant);
                }
            })
            .catch(console.error);
      }
  }, [status, listingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData({ ...formData, status: newStatus });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validation: If donated, must pick recipient
    if (formData.status === 'donated' && !formData.recipientId) {
        setError("Please select the user who received this donation.");
        setIsSubmitting(false);
        return;
    }

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) return <p className="text-center p-10">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Listing</h1>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Status Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex space-x-2">
            {[
              { value: "available", label: "Available", color: "bg-green-600 hover:bg-green-700" },
              { value: "on_hold", label: "On Hold", color: "bg-yellow-500 hover:bg-yellow-600" },
              { value: "donated", label: "Donated", color: "bg-gray-600 hover:bg-gray-700" },
            ].map((option) => (
              <button
                key={option.value}
                type="button" 
                onClick={() => handleStatusChange(option.value)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors border ${
                  formData.status === option.value
                    ? `${option.color} text-white border-transparent ring-2 ring-offset-1 ring-${option.color.split("-")[1]}-500` 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50" 
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ NEW: Recipient Selection (Only shows if 'Donated' is selected) */}
        {formData.status === 'donated' && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-gray-800 mb-2">Who received this item?</label>
                {potentialRecipients.length > 0 ? (
                    <select 
                        name="recipientId" 
                        value={formData.recipientId} 
                        onChange={handleChange}
                        className="w-full border-gray-300 rounded-md p-2"
                        required={formData.status === 'donated'}
                    >
                        <option value="">-- Select a user from your chats --</option>
                        {potentialRecipients.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                ) : (
                    <div className="text-sm text-amber-600">
                        No chat history found for this item. You can save, but tracking will be incomplete.
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                    Select the person you messaged with to confirm the exchange.
                </p>
            </div>
        )}

        {/* Standard Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input name="title" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.title} onChange={handleChange} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" required rows={6} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.description} onChange={handleChange} />
        </div>

        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input name="city" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.city} onChange={handleChange} />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input name="collectionDeadline" type="date" required min={getMinDate()} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.collectionDeadline} onChange={handleChange} />
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => router.back()} className="w-1/3 flex justify-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="w-2/3 flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}