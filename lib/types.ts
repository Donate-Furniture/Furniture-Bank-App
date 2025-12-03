// --- 1. Define the User Structure ---
export interface User {
  id: string;
  email: string;
  firstName: string; 
  lastName: string;
  location: string | null;
  createdAt: string;
}

// --- 2. Define the Listing Structure ---
export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  status: string;
  city: string;
  zipCode: string | null;
  imageUrls: string[];
  createdAt: string;
  // Included User details
  user: {
    id: string;
    firstName: string;
    lastName: string;
    location: string | null;
    email: string;
  };
}

