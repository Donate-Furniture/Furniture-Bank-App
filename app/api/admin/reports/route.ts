// Admin Reports API: Manages user-submitted reports for content moderation.
// Supports fetching all reports (GET) and updating their status to resolved/dismissed (PUT).

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// Force dynamic to ensure admins see real-time report data
export const dynamic = "force-dynamic";

// --- GET: Fetch Moderation Queue ---
export async function GET(request: NextRequest) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Fetch Reports: Order by newest first, include all context (who, what, against whom)
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { firstName: true, lastName: true, email: true } },
        reportedListing: { select: { id: true, title: true } },
        reportedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- PUT: Resolve or Dismiss Report ---
export async function PUT(request: NextRequest) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Parse Action: Get report ID and new status ('resolved' | 'dismissed')
    const body = await request.json();
    const { id, status } = body;

    // 3. Update Database
    await prisma.report.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update Report Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
