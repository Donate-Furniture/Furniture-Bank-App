// Reports Submission API: Public endpoint for users to flag inappropriate content or behavior.
// Handles reports linked to either a specific listing or a target user, ensuring data integrity.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // @ts-ignore
  const reporterId = session.user.id;

  try {
    const body = await request.json();
    const { reason, details, listingId, targetUserId } = body;

    // 2. Validation
    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // 3. Database Entry
    // Creates a new report record linking the reporter to the content (listing) or person (user)
    await prisma.report.create({
      data: {
        reason,
        details,
        reporterId,
        // Connect report to either a listing OR a user (can be one or the other based on context)
        reportedListingId: listingId || null,
        reportedUserId: targetUserId || null,
      },
    });

    return NextResponse.json(
      { message: "Report submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Report Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
