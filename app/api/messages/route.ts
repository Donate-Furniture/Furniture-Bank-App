// Messaging API: Central hub for the internal chat system.
// Handles sending messages (POST), marking them as read (PUT), and retrieving both conversation history and the inbox summary (GET).

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// Force dynamic to ensure real-time chat updates
export const dynamic = "force-dynamic";

// --- POST: Send a Message ---
export async function POST(request: NextRequest) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const senderId = (session.user as any).id;

  try {
    const body = await request.json();
    const { recipientId, content, listingId } = body;

    // 2. Validation
    if (!recipientId || !content)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // 3. Create Message
    const newMessage = await prisma.message.create({
      data: { senderId, recipientId, content, listingId: listingId || null },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- PUT: Mark Conversation as Read ---
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const { senderId, listingId } = body; // ✅ Added listingId support

    if (!senderId)
      return NextResponse.json(
        { error: "Sender ID required" },
        { status: 400 }
      );

    // Build query to update only relevant messages
    const whereClause: any = {
      senderId: senderId,
      recipientId: userId,
      read: false,
    };

    // ✅ FIX: Strict separation logic.
    // If listingId is provided, only mark those specific messages as read.
    // If NOT provided, mark only the "General" chat (null) as read.
    // This prevents clearing notifications for Item A when reading Item B.
    if (listingId) {
      whereClause.listingId = listingId;
    } else {
      whereClause.listingId = null;
    }

    // Update unread messages
    await prisma.message.updateMany({
      where: whereClause,
      data: { read: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- GET: Fetch History, Inbox, or Unread Count ---
export async function GET(request: NextRequest) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const otherUserId = searchParams.get("userId");
  const listingIdParam = searchParams.get("listingId"); // ✅ Added param
  const getUnreadCount = searchParams.get("unreadCount");

  try {
    // MODE A: Get Global Unread Count (for badges)
    if (getUnreadCount) {
      const count = await prisma.message.count({
        where: { recipientId: userId, read: false },
      });
      return NextResponse.json({ count }, { status: 200 });
    }

    // MODE B: Fetch Specific Conversation History
    if (otherUserId) {
      const whereClause: any = {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      };

      // ✅ FIX: Strict separation is required to prevent merging.
      // If listingId is passed, we show that item's chat.
      // If listingId is NOT passed (or is 'null'), we show the 'General' chat (listingId: null).
      // We do NOT return 'all' messages anymore, as that causes the merging issue.
      if (listingIdParam && listingIdParam !== 'undefined' && listingIdParam !== 'null') {
        whereClause.listingId = listingIdParam;
      } else {
        whereClause.listingId = null; 
      }

      const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" }, // Oldest first for chat bubbles
        include: {
          sender: { select: { firstName: true, lastName: true } },
          recipient: { select: { firstName: true, lastName: true } },
          listing: { select: { id: true, title: true } },
        },
      });
      return NextResponse.json({ messages }, { status: 200 });
    }

    // MODE C: Fetch Inbox (List of distinct conversations)
    // 1. Get ALL messages involving user, sorted by newest first
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
        listing: {
          select: {
            id: true,
            title: true,
            imageUrls: true,
          },
        },
      },
    });

    // 2. Group by "Other User" AND "Listing" to create distinct conversation threads
    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
      
      // ✅ FIX: Create composite key so User A + Item A is distinct from User A + Item B
      const listingKey = msg.listingId || 'general';
      const conversationKey = `${otherUser.id}_${listingKey}`;

      // Since messages are sorted desc, the first time we see this key, it's the latest message
      if (!conversationsMap.has(conversationKey)) {
        // Determine if this specific thread is unread
        const isUnread = msg.recipientId === userId && !msg.read;

        conversationsMap.set(conversationKey, {
          user: otherUser,
          lastMessage: msg.content,
          date: msg.createdAt,
          isUnread: isUnread,

          listingId: msg.listing?.id || null,
          listingTitle: msg.listing?.title || (msg.listingId ? "Unknown Listing" : "General"),
          listingImage: msg.listing?.imageUrls?.[0] || null,
        });
      }
    });

    return NextResponse.json(
      { conversations: Array.from(conversationsMap.values()) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}