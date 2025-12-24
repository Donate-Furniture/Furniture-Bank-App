// Admin Approval Endpoint: Handles toggling listing visibility (Approve/Hide) and aggressively clearing the Next.js cache.
// Ensures that listing changes are immediately reflected on public pages.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Parse Request: Check if we are Approving (true) or Hiding (false)
    const body = await request.json().catch(() => ({}));
    const { isApproved } = body;

    // Default to 'true' (Approve) if no status is sent in body
    const statusToSet = typeof isApproved === "boolean" ? isApproved : true;

    // 3. Database Update: Set status and timestamp
    await prisma.listing.update({
      where: { id: params.id },
      data: {
        isApproved: statusToSet,
        approvedAt: statusToSet ? new Date() : null,
      },
    });

    // 4. Cache Invalidation: Critical for ISR/Static pages
    // Clear Home Page (Recent Listings)
    revalidatePath("/");
    // Clear Search/Listings Page
    revalidatePath("/listings");
    // Clear the specific Listing Detail Page
    revalidatePath(`/listings/${params.id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Admin Approve Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
