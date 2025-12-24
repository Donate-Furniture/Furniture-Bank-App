// Listing Creation Page: A multi-step form for donors to post new items.
// Includes real-time value estimation logic, image uploading, and specific validation rules for high-value or antique items.

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/app/components/ImageUpload";

const MAIN_CATEGORIES = ["Furniture", "Vehicles", "Books", "Antique"];
const CURRENT_YEAR = new Date().getFullYear();

// Helper: Enforce a minimum 1-week pickup window
const getMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

export default function CreateListingPage() {
  // --- Auth & Routing ---
  const { status } = useSession();
  const router = useRouter();

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: MAIN_CATEGORIES[0],
    subCategory: "",
    originalPrice: "",
    purchaseYear: CURRENT_YEAR.toString(),
    condition: "new",
    city: "",
    zipCode: "",
    isValuated: false,
    valuationPrice: "",
    collectionDeadline: "",
    imageUrls: [] as string[],
    receiptUrl: [] as string[],
    valuationDocUrl: [] as string[],
  });

  const [liveEstimate, setLiveEstimate] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic to trigger strict valuation rules
  const isHighValue = parseFloat(formData.originalPrice) >= 1000;

  // --- Real-time FMV Calculator ---
  // Automatically updates the "Estimated Tax Value" as the user inputs data
  useEffect(() => {
    const price = parseFloat(formData.originalPrice);
    const year = parseInt(formData.purchaseYear);

    if (isNaN(price) || isNaN(year)) {
      setLiveEstimate(null);
      return;
    }

    // Override: If user provides a professional valuation, use that
    if (formData.isValuated && formData.valuationPrice) {
      setLiveEstimate(parseFloat(formData.valuationPrice));
      return;
    }

    // Rule: Items under $20 have 0 tax value
    if (price < 20) {
      setLiveEstimate(0);
      return;
    }

    // Rule: New items retain full value
    if (formData.condition === "new") {
      setLiveEstimate(price);
      return;
    }

    // Standard Depreciation Algorithm
    const age = CURRENT_YEAR - year;
    let value = 0;
    if (age <= 1) value = price * 0.6;
    else if (age <= 2) value = price * 0.5;
    else value = price * 0.34;

    // Additional cut for used condition
    if (formData.condition === "used") value = value * 0.5;

    setLiveEstimate(Math.round(value * 100) / 100);
  }, [
    formData.originalPrice,
    formData.purchaseYear,
    formData.condition,
    formData.isValuated,
    formData.valuationPrice,
  ]);

  // Guard: Protect route
  if (status === "loading")
    return <p className="text-center p-10">Loading...</p>;
  if (status === "unauthenticated") {
    router.push("/auth");
    return null;
  }

  // --- Handlers ---

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleValuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isValuated: e.target.checked });
  };

  // Helper factory for handling array-based image states
  const createUploadHandlers = (
    field: "imageUrls" | "receiptUrl" | "valuationDocUrl"
  ) => ({
    onUpload: (url: string) => {
      setFormData((prev) => ({ ...prev, [field]: [...prev[field], url] }));
    },
    onRemove: (url: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((u) => u !== url),
      }));
    },
  });

  // --- Submission & Validation ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Rule 1: Visual Proof
    if (formData.imageUrls.length < 4) {
      setError("Minimum 4 item photos required.");
      setIsSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }

    // Rule 2: High Value items must have documentation
    if (
      isHighValue &&
      (!formData.isValuated || formData.valuationDocUrl.length === 0)
    ) {
      setError(
        "High-value items ($1000+) require professional valuation and documentation."
      );
      setIsSubmitting(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }

    // Rule 3: Antique Age Requirement (Must be >20 years old)
    if (formData.category === "Antique") {
      const year = parseInt(formData.purchaseYear);
      const age = CURRENT_YEAR - year;
      if (age < 20) {
        setError("Antiques must be at least 20 years old.");
        setIsSubmitting(false);
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
        return;
      }
    }

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create listing");
      }

      alert("Listing created!");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 mb-20">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Post a Donation</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Item Photos */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            1. Item Photos
          </h3>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload at least 4 photos
            </label>
            <ImageUpload
              value={formData.imageUrls}
              {...createUploadHandlers("imageUrls")}
            />
            <p className="text-xs text-gray-500 mt-2">
              {formData.imageUrls.length} / 4 required.
            </p>
          </div>
        </div>

        {/* Section 2: Basic Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
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
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="category"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.category}
                onChange={handleChange}
              >
                {MAIN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">
                Sub Category
              </label>
              <input
                name="subCategory"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.subCategory}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Value Calculator & Receipt */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 space-y-6">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
            Value Calculator
          </h3>

          <div className="flex gap-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700">
                Original Bill ($)
              </label>
              <input
                name="originalPrice"
                type="number"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.originalPrice}
                onChange={handleChange}
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700">
                Year Bought
              </label>
              <input
                name="purchaseYear"
                type="number"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.purchaseYear}
                onChange={handleChange}
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700">
                Condition
              </label>
              <select
                name="condition"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.condition}
                onChange={handleChange}
              >
                <option value="new">New</option>
                <option value="used_like_new">Used Like New</option>
                <option value="used">Used</option>
                {formData.category === "Vehicles" && (
                  <option value="scrap" className="font-bold text-red-600">
                    Scrap (Value $350)
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Live Estimation Output */}
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600 font-medium">
                Estimated Fair Market Value (FMV)*:
              </span>
              <span className="text-2xl font-bold text-green-600">
                {liveEstimate !== null ? `$${liveEstimate.toFixed(2)}` : "--"}
              </span>
            </div>
            <p className="text-xs text-gray-500 italic">
              *Estimate based on standard depreciation.
            </p>
          </div>

          <div className="border-t border-blue-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt / Proof of Value (Optional)
            </label>
            <ImageUpload
              value={formData.receiptUrl}
              {...createUploadHandlers("receiptUrl")}
            />
          </div>
        </div>

        {/* Section 4: Valuation Section (Conditional Styling) */}
        <div
          className={`p-5 rounded-xl border transition-colors ${
            isHighValue && !formData.isValuated
              ? "bg-red-50 border-red-300 ring-2 ring-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="isValuated"
                name="isValuated"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                checked={formData.isValuated}
                onChange={handleValuationChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="isValuated" className="font-medium text-gray-700">
                Has Professional Valuation?
              </label>
              {isHighValue && (
                <p className="text-red-600 font-bold mt-1">
                  Required for items valued over $1000.
                </p>
              )}
            </div>
          </div>

          {/* Manual Valuation Input */}
          {formData.isValuated && (
            <div className="mt-4 pl-7 space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo-700">
                  Appraised Value ($)
                </label>
                <input
                  name="valuationPrice"
                  type="number"
                  placeholder="Enter amount"
                  className="mt-1 block w-full px-3 py-2 border border-indigo-300 rounded-md"
                  value={formData.valuationPrice}
                  onChange={handleChange}
                  required={formData.isValuated}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-indigo-700 mb-2">
                  Upload Valuation Document (Required)
                </label>
                <ImageUpload
                  value={formData.valuationDocUrl}
                  {...createUploadHandlers("valuationDocUrl")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Logistics */}
        <div className="flex gap-4">
          <input
            name="city"
            type="text"
            placeholder="City"
            required
            className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md"
            value={formData.city}
            onChange={handleChange}
          />
          <input
            name="collectionDeadline"
            type="date"
            required
            min={getMinDate()}
            className="w-1/2 mt-1 block px-3 py-2 border border-gray-300 rounded-md"
            value={formData.collectionDeadline}
            onChange={handleChange}
          />
        </div>

        {/* Error Message (Displayed near button) */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400 transition-colors"
        >
          {isSubmitting ? "Submitting Donation..." : "Post Donation"}
        </button>
      </form>
    </div>
  );
}
