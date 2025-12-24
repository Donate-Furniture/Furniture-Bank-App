// Admin Users API: Manages the global user directory.
// Supports robust searching/pagination for the admin table and allows manual user provisioning.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { hashPassword } from "@/lib/auth";

// Ensure the admin table always shows the latest user data
export const dynamic = "force-dynamic";

// --- GET: List All Users ---
export async function GET(request: NextRequest) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse Pagination & Filter Params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {};

    // 3. Search Logic: Filter by name, email, or phone
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // 4. Fetch Data: Get users + Total count for pagination in one transaction
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { listings: true }, // Include listing count for the table
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- POST: Manually Create User (Admin Only) ---
export async function POST(request: NextRequest) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Validate Input
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber,
      streetAddress,
      city,
      province,
      postalCode,
    } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3. Check for Duplicates
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // 4. Hash Password & Create
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "USER", // Admin can assign specific roles
        phoneNumber,
        streetAddress,
        city,
        province,
        postalCode,
        provider: "credentials",
      },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
