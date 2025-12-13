// File: lib/types.ts

// --- 1. Define the User Structure ---
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  location: string | null;
  provider?: string | null;
  createdAt: string;
}

// --- 2. Define the Listing Structure ---
export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string | null;

  // Pricing Algo Fields (Must be number/string to match DB)
  originalPrice: number;
  purchaseYear: number;
  condition: string;

  // Valuation & Result
  isValuated: boolean;
  valuationPrice: number | null;
  estimatedValue: number | null;

  status: string;
  city: string;
  zipCode: string | null;
  imageUrls: string[];
  receiptUrl: string | null;

  collectionDeadline: string;

  createdAt: string;

  // Included User details
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
