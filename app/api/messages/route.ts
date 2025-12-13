// File: app/api/messages/route.ts
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

// POST: Send a message
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const senderId = (session.user as any).id;

  try {
    const body = await request.json();
    const { recipientId, content, listingId } = body;

    if (!recipientId || !content)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const newMessage = await prisma.message.create({
      data: { senderId, recipientId, content, listingId: listingId || null },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT: Mark as read
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const { senderId } = body;

    if (!senderId)
      return NextResponse.json(
        { error: "Sender ID required" },
        { status: 400 }
      );

    await prisma.message.updateMany({
      where: {
        senderId: senderId,
        recipientId: userId,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: Fetch history OR inbox
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const otherUserId = searchParams.get("userId");
  const getUnreadCount = searchParams.get("unreadCount");

  try {
    if (getUnreadCount) {
      const count = await prisma.message.count({
        where: { recipientId: userId, read: false },
      });
      return NextResponse.json({ count }, { status: 200 });
    }

    // CASE 1: Fetch specific conversation history
    if (otherUserId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { firstName: true, lastName: true } },
          recipient: { select: { firstName: true, lastName: true } },
          listing: { select: { id: true, title: true } },
        },
      });
      return NextResponse.json({ messages }, { status: 200 });
    }

    // CASE 2: Fetch Inbox (List of conversations)
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
        // Include ID and ImageUrls here
        listing: {
          select: {
            id: true,
            title: true,
            imageUrls: true,
          },
        },
      },
    });

    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;

      if (!conversationsMap.has(otherUser.id)) {
        // Determine if this is unread
        const isUnread = msg.recipientId === userId && !msg.read;

        conversationsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          date: msg.createdAt,
          isUnread: isUnread,

          listingId: msg.listing?.id,
          listingTitle: msg.listing?.title,
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
