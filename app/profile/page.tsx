// File: app/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MyListings from "@/app/components/MyListings";
import { User } from "@/lib/types";
import { Fruktur } from "next/font/google";

// Helper function to safely format dates
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Unknown";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return "Invalid Date";
  }
};

export default function ProfilePage() {
  //Use useSession hook
  const { data: session, status } = useSession();
  const router = useRouter();

  // State to hold the full profile data fetched from DB
  const [fullProfile, setFullProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }

    if (status === "authenticated") {
      // Fetch the heavy data from the API
      const fetchProfile = async () => {
        try {
          const res = await fetch("/api/user/me");
          const data = await res.json();
          if (res.ok) {
            setFullProfile(data.user);
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        } finally {
          setIsLoadingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [status, router]);

  if (status === "loading" || isLoadingProfile) {
    return <p className="text-center p-10">Loading profile data...</p>;
  }

  const formattedAddress = [
    fullProfile?.streetAddress,
    fullProfile?.city,
    fullProfile?.province,
    fullProfile?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-2">
        My Profile Dashboard
      </h1>

      <div className="bg-white p-6 shadow-xl rounded-xl border border-indigo-100 mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-600">
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <p>
            <span className="font-medium">Name:</span> {fullProfile?.firstName}{" "}
            {fullProfile?.lastName}
          </p>
          <p>
            <span className="font-medium">Email:</span> {fullProfile?.email}
          </p>
          <p>
            <span className="font-medium">Address:</span>{" "}
            {formattedAddress || "Not set"}
          </p>
          <p>
            <span className="font-medium">Phone:</span>{" "}
            {fullProfile?.phoneNumber || "Not set"}
          </p>
          <p>
            <span className="font-medium">Member Since:</span>{" "}
            {formatDate(fullProfile?.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <MyListings />
      </div>
    </div>
  );
}
