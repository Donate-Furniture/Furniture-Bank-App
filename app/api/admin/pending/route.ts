// Admin Pending Listings API: Retrieves the queue of unapproved listings for moderation.
// Orders by oldest first ('asc') so admins tackle the backlog in chronological order.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// Ensure dynamic rendering so the moderation queue is always fresh
export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Fetch Queue: Get all unapproved items, prioritizing the oldest ones first
    const listings = await prisma.listing.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "asc" }, // Oldest pending first
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ listings }, { status: 200 });
  } catch (error) {
    console.error("Fetch Pending Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
