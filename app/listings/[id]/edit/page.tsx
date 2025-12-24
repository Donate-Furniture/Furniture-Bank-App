// Edit Listing Page: Allows users to modify their existing donations.
// Pre-fills form data, enforces ownership security, and handles updates via the API.

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Listing } from "@/lib/types";

const MAIN_CATEGORIES = ["Furniture", "Vehicles", "Books", "Antique"];
const CURRENT_YEAR = new Date().getFullYear();

// Calculate minimum date (today + 7 days) for the date picker
const getMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

// Helper: Format DateTime string to YYYY-MM-DD for <input type="date">
const toDateInputString = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function EditListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const user = session?.user;

  // --- Form State ---
  // Only tracks fields that are allowed to be edited
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    zipCode: "",
    status: "available",
    collectionDeadline: "",
  });

  // --- Read-Only Context ---
  // Stores immutable data (like original price/category) to display context to the user
  const [readOnlyData, setReadOnlyData] = useState<{
    category: string;
    subCategory: string | null;
    estimatedValue: number | null;
    originalPrice: number;
    collectionDeadline: string;
  } | null>(null);

  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Load: Fetch Listing & Verify Ownership
  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch listing");

        const listing: Listing = data.listing;

        // Security Guard: specific check to ensure only the owner can edit
        // (The API also enforces this, but client-side redirect improves UX)
        if (user && (user as any).id !== listing.user.id) {
          router.push("/");
          return;
        }

        // Hydrate Form State
        setFormData({
          title: listing.title,
          description: listing.description,
          city: listing.city,
          zipCode: listing.zipCode || "",
          status: listing.status,
          collectionDeadline: toDateInputString(listing.collectionDeadline),
        });

        // Hydrate Read-Only Data
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

    if (status === "authenticated") {
      fetchListing();
    } else if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [listingId, status, user, router]);

  // --- Handlers ---

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData({ ...formData, status: newStatus });
  };

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          throw new Error("Failed to update listing");
        }
      } else {
        // Success: Redirect back to the listing detail page
        router.push(`/listings/${listingId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching || status === "loading")
    return <p className="text-center p-10">Loading listing data...</p>;

  const formattedValue = readOnlyData?.estimatedValue
    ? `$${readOnlyData.estimatedValue.toFixed(2)}`
    : "Pending";

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Listing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update the details of your donation.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* --- Context Block (Read-Only) --- */}
      <div className="bg-blue-50 p-4 rounded-md mb-6 flex justify-between items-center text-sm text-blue-800">
        <div>
          <span className="font-semibold">Category:</span>{" "}
          {readOnlyData?.category}
          {readOnlyData?.subCategory && ` (${readOnlyData.subCategory})`}
        </div>
        <div className="text-right">
          <div className="font-semibold">
            Original Bill: ${readOnlyData?.originalPrice.toFixed(2)}
          </div>
          <div className="font-bold text-green-700">
            Tax Value: {formattedValue}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Status Toggle --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex space-x-2">
            {[
              {
                value: "available",
                label: "Available",
                color: "bg-green-600 hover:bg-green-700",
              },
              {
                value: "on_hold",
                label: "On Hold",
                color: "bg-yellow-500 hover:bg-yellow-600",
              },
              {
                value: "donated",
                label: "Donated",
                color: "bg-gray-600 hover:bg-gray-700",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusChange(option.value)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors border ${
                  formData.status === option.value
                    ? `${
                        option.color
                      } text-white border-transparent ring-2 ring-offset-1 ring-${
                        option.color.split("-")[1]
                      }-500`
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- Text Inputs --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            name="title"
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            required
            rows={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        {/* --- Location & Deadline --- */}
        <div className="flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
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
            <label className="block text-sm font-medium text-gray-700">
              Latest Collection Date
            </label>
            <input
              name="collectionDeadline"
              type="date"
              required
              min={getMinDate()} // Client-side check
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.collectionDeadline}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 1 week from today.
            </p>
          </div>
        </div>

        {/* --- Actions --- */}
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
