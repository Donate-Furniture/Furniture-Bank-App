// User Listings API: Retrieves the portfolio of listings owned by the currently authenticated user.
// Used for the "My Listings" dashboard to let users manage their own inventory.

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  // 1. Security Guard: Verify Session
  // Unlike public routes, this one strictly requires an active login.
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in." },
      { status: 401 }
    );
  }

  // Safely extract User ID from the session (populated by the jwt callback)
  const userId = (session.user as any).id;

  try {
    // 2. Fetch User's Listings: Filter by session ID and sort by newest
    const userListings = await prisma.listing.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            city: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ listings: userListings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
