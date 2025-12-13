"use client";

import { useState, useEffect } from "react";
import ListingCard from "@/app/components/ListingCard";
import { Listing } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";

const CATEGORIES = ["All", "Furniture", "Vehicles", "Books", "Antique"];
const CONDITIONS = ["All", "like_new", "excellent", "well_used"];

export default function AllListingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "All",
    city: searchParams.get("city") || "",
    condition: searchParams.get("condition") || "All",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    sort: "date_desc",
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch listings whenever filters OR page changes
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.search) query.set("search", filters.search);
        if (filters.category !== "All") query.set("category", filters.category);
        if (filters.city) query.set("city", filters.city);
        if (filters.condition !== "All")
          query.set("condition", filters.condition);
        if (filters.minPrice) query.set("minPrice", filters.minPrice);
        if (filters.maxPrice) query.set("maxPrice", filters.maxPrice);
        query.set("sort", filters.sort);

        // Add Pagination Params
        query.set("page", page.toString());
        query.set("limit", "12");

        const res = await fetch(`/api/listings?${query.toString()}`);
        const data = await res.json();

        setListings(data.listings || []);
        //Set Total Pages from API response
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(() => {
      fetchListings();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, page]); // Re-run when page changes

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1); // Reset to page 1 when filters change
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">All Listings</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* --- LEFT SIDEBAR: FILTERS --- */}
        <aside className="w-full lg:w-1/4 space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          {/* ... (Search, Category, City, Condition inputs remain exactly the same) ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keyword
            </label>
            <input
              name="search"
              type="text"
              placeholder="Search..."
              className="w-full border-gray-300 rounded-md shadow-sm"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              className="w-full border-gray-300 rounded-md"
              value={filters.category}
              onChange={handleFilterChange}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              name="city"
              type="text"
              placeholder="Montreal..."
              className="w-full border-gray-300 rounded-md"
              value={filters.city}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              name="condition"
              className="w-full border-gray-300 rounded-md"
              value={filters.condition}
              onChange={handleFilterChange}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Range
            </label>
            <div className="flex gap-2">
              <input
                name="minPrice"
                type="number"
                placeholder="Min"
                className="w-1/2 border-gray-300 rounded-md"
                value={filters.minPrice}
                onChange={handleFilterChange}
              />
              <input
                name="maxPrice"
                type="number"
                placeholder="Max"
                className="w-1/2 border-gray-300 rounded-md"
                value={filters.maxPrice}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              name="sort"
              className="w-full border-gray-300 rounded-md"
              value={filters.sort}
              onChange={handleFilterChange}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </aside>

        {/* --- MAIN CONTENT: RESULTS --- */}
        <main className="w-full lg:w-3/4">
          {loading ? (
            <p className="text-center py-10 text-gray-500">
              Updating results...
            </p>
          ) : listings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {listings.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-lg text-gray-500">
                No listings match your filters.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    ...filters,
                    search: "",
                    category: "All",
                    city: "",
                    minPrice: "",
                    maxPrice: "",
                  })
                }
                className="mt-2 text-indigo-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
