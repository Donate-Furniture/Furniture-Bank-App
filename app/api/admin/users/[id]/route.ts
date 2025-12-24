// Admin User Detail API: Handles granular data fetching for a specific user (profile, listings, messages) and account deletion.
// Includes specific sub-resource fetching to support the admin drill-down view and safeguards against admins deleting themselves.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { hashPassword } from "@/lib/auth";

// --- GET: Fetch Single User Data (Profile, Listings, or Messages) ---
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse View Mode: 'info' (default), 'listings', or 'messages'
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "info";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 5; // Tighter limit for sub-views
  const skip = (page - 1) * limit;

  try {
    // 3. Sub-View: Fetch User's Listings
    if (type === "listings") {
      const [listings, total] = await prisma.$transaction([
        prisma.listing.findMany({
          where: { userId: params.id },
          take: limit,
          skip: skip,
          orderBy: { createdAt: "desc" },
        }),
        prisma.listing.count({ where: { userId: params.id } }),
      ]);
      return NextResponse.json({
        data: listings,
        pagination: { total, page, totalPages: Math.ceil(total / limit) },
      });
    }

    // 4. Sub-View: Fetch User's Messages (Sent & Received)
    if (type === "messages") {
      const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
          where: { OR: [{ senderId: params.id }, { recipientId: params.id }] },
          take: limit,
          skip: skip,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { email: true, firstName: true } },
            recipient: { select: { email: true, firstName: true } },
          },
        }),
        prisma.message.count({
          where: { OR: [{ senderId: params.id }, { recipientId: params.id }] },
        }),
      ]);
      return NextResponse.json({
        data: messages,
        pagination: { total, page, totalPages: Math.ceil(total / limit) },
      });
    }

    // 5. Default View: User Profile + Activity Counts
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            listings: true,
            sentMessages: true,
            receivedMessages: true,
          },
        },
      },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- DELETE: Remove User Account ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Safety Check: Prevent Admin Self-Delete
    // @ts-ignore
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own admin account." },
        { status: 400 }
      );
    }

    // 2. Execute Deletion (Cascading deletes handled by DB schema usually)
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
