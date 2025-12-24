// Listings API: Core endpoint for creating new items (POST) and searching the public catalog (GET).
// Includes automated price estimation logic and "lazy" auto-approval for older pending items.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// --- HELPER: Pricing Algorithm ---
// Calculates current value based on depreciation rules (60% after 1 year, 50% after 2, 34% after 3+)
function calculateEstimatedValue(
  originalPrice: number,
  purchaseYear: number,
  condition: string,
  category: string
): number {
  // Scrap vehicles have a fixed floor price
  if (category === "Vehicles" && condition === "scrap") {
    return 350;
  }
  // Items under $20 have no resale value for tax receipts
  if (originalPrice < 20) return 0;
  if (condition === "new") return originalPrice;

  const currentYear = new Date().getFullYear();
  const age = currentYear - purchaseYear;
  let value = 0;

  // Apply depreciation based on age
  if (age <= 1) value = originalPrice * 0.6;
  else if (age <= 2) value = originalPrice * 0.5;
  else value = originalPrice * 0.34;

  // Apply further reduction if used
  if (condition === "used") value = value * 0.5;

  return Math.round(value * 100) / 100;
}

// --- POST: Create New Listing ---
export async function POST(request: NextRequest) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      city,
      zipCode,
      imageUrls,
      receiptUrl,
      subCategory,
      isValuated,
      valuationPrice,
      valuationDocUrl,
      originalPrice,
      purchaseYear,
      condition,
      collectionDeadline,
    } = body;

    // 2. Validate Images (Minimum 4 required)
    const validImageUrls = Array.isArray(imageUrls) ? imageUrls : [];
    if (validImageUrls.length < 4)
      return NextResponse.json(
        { error: "Please upload at least 4 photos." },
        { status: 400 }
      );

    // 3. Validate Date (Must be at least 6 days in the future)
    if (!collectionDeadline)
      return NextResponse.json(
        { error: "Deadline required." },
        { status: 400 }
      );
    const deadlineDate = new Date(collectionDeadline);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 6);
    minDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < minDate)
      return NextResponse.json(
        { error: "Deadline too soon." },
        { status: 400 }
      );

    const billPrice = parseFloat(originalPrice);
    const year = parseInt(purchaseYear);
    let finalEstimatedValue = 0;
    let finalValuationPrice = null;

    // 4. Valuation Logic & Fraud Prevention
    const validValuationDocs = Array.isArray(valuationDocUrl)
      ? valuationDocUrl
      : [];

    if (billPrice > 999) {
      // High-value items REQUIRE a manual valuation and document
      if (!isValuated || !valuationPrice)
        return NextResponse.json(
          { error: "Items > $999 require valuation." },
          { status: 400 }
        );
      if (isValuated && validValuationDocs.length === 0)
        return NextResponse.json(
          { error: "Valuation doc required." },
          { status: 400 }
        );
      finalValuationPrice = parseFloat(valuationPrice);
      finalEstimatedValue = finalValuationPrice;
    } else {
      // Low-value items use algorithm unless user overrides
      if (isValuated && valuationPrice) {
        finalValuationPrice = parseFloat(valuationPrice);
        finalEstimatedValue = finalValuationPrice;
      } else {
        finalEstimatedValue = calculateEstimatedValue(
          billPrice,
          year,
          condition,
          category
        );
      }
    }

    // Anti-Inflation Rule: Valuation cannot exceed original bill price (unless Antique/Scrap)
    const isScrapVehicle = category === "Vehicles" && condition === "scrap";
    if (
      category !== "Antique" &&
      !isScrapVehicle &&
      finalEstimatedValue > billPrice
    ) {
      return NextResponse.json(
        { error: "Value cannot exceed original price." },
        { status: 400 }
      );
    }

    // 5. Database Creation
    const newListing = await prisma.listing.create({
      data: {
        title,
        description,
        category,
        subCategory: subCategory || null,
        originalPrice: billPrice,
        purchaseYear: year,
        condition,
        isValuated: isValuated || false,
        valuationPrice: finalValuationPrice,
        estimatedValue: finalEstimatedValue,
        city,
        zipCode: zipCode || null,
        imageUrls: validImageUrls,
        receiptUrl: Array.isArray(receiptUrl) ? receiptUrl : [],
        valuationDocUrl: validValuationDocs,
        collectionDeadline: new Date(collectionDeadline),
        userId,
      },
    });
    return NextResponse.json(
      { message: "Success", listing: newListing },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// --- GET: Public Search & Filtering ---
export async function GET(request: NextRequest) {
  try {
    // 1. Lazy Auto-Approval Logic
    // Automatically approve any pending listing created more than 48 hours ago
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.listing.updateMany({
      where: { isApproved: false, createdAt: { lt: fortyEightHoursAgo } },
      data: { isApproved: true, approvedAt: new Date() },
    });

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const condition = searchParams.get("condition");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort");

    // 3. Build Dynamic Query
    const whereClause: any = {
      // Only show approved content to public
      isApproved: true,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "All") whereClause.category = category;
    if (city) whereClause.city = { contains: city, mode: "insensitive" };
    if (condition && condition !== "All") whereClause.condition = condition;

    if (minPrice || maxPrice) {
      whereClause.estimatedValue = {};
      if (minPrice) whereClause.estimatedValue.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.estimatedValue.lte = parseFloat(maxPrice);
    }

    // 4. Determine Sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { estimatedValue: "asc" };
    if (sort === "price_desc") orderBy = { estimatedValue: "desc" };
    if (sort === "date_asc") orderBy = { createdAt: "asc" };
    if (sort === "date_desc") orderBy = { createdAt: "desc" };

    // 5. Fetch Data & Count (Transaction for consistency)
    const [listings, totalCount] = await prisma.$transaction([
      prisma.listing.findMany({
        where: whereClause,
        orderBy: orderBy,
        take: limit,
        skip: skip,
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
      }),
      prisma.listing.count({ where: whereClause }),
    ]);

    return NextResponse.json(
      {
        listings,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching listings." },
      { status: 500 }
    );
  }
}
