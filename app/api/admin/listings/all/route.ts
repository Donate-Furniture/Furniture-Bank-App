// Admin Listings API: Fetches all listings for the admin dashboard with robust search (including user details) and pagination.
// Using 'force-dynamic' to ensure the admin always sees the absolute latest data.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Ensure this route is never cached statically
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse Query Params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {};

    // 3. Search Logic: Broad filtering across listing details AND user info
    if (search) {
      whereClause.OR = [
        // Listing Fields
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { subCategory: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { zipCode: { contains: search, mode: "insensitive" } },
        // Relation Fields (Search by who posted it)
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 4. Fetch Data & Count in one trip (Transaction)
    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.listing.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      listings,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin Listings Fetch Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
