// File: app/api/listings/route.ts
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// --- HELPER: Pricing Algorithm ---
function calculateEstimatedValue(
  originalPrice: number,
  purchaseYear: number,
  condition: string
): number {
  if (originalPrice < 20) return 0;

  // If New, no depreciation. Value = Bill Price.
  if (condition === "new") {
    return originalPrice;
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - purchaseYear;
  let value = 0;

  // 2. Calculate Age-Based Base Value (For Used items)
  if (age <= 1) {
    // 1 year old or less = 40% off (Retain 60%)
    value = originalPrice * 0.6;
  } else if (age <= 2) {
    // 2 years old = 50% off (Retain 50%)
    value = originalPrice * 0.5;
  } else {
    // 3+ years old = 66% off (Retain 34%)
    value = originalPrice * 0.34;
  }

  // 3. Apply Condition Penalty
  // 'used' gets an EXTRA 50% off the already depreciated value
  if (condition === "used") {
    value = value * 0.5;
  }

  return Math.round(value * 100) / 100;
}

//GET and POST handlers for listings
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    // ... (Destructuring remains the same) ...
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
      originalPrice,
      purchaseYear,
      condition,
      collectionDeadline,
    } = body;

    // Validation
    if (!imageUrls || imageUrls.length < 4) {
      return NextResponse.json(
        { error: "Please upload at least 4 photos of the item." },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(collectionDeadline);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < minDate) {
      return NextResponse.json(
        { error: "Collection deadline must be at least 1 week from today." },
        { status: 400 }
      );
    }

    const billPrice = parseFloat(originalPrice);
    const year = parseInt(purchaseYear);
    let finalEstimatedValue = 0;
    let finalValuationPrice = null;

    if (billPrice > 999) {
      if (!isValuated || !valuationPrice) {
        return NextResponse.json(
          { error: "Items > $999 require valuation." },
          { status: 400 }
        );
      }
      finalValuationPrice = parseFloat(valuationPrice);
      finalEstimatedValue = finalValuationPrice;
    } else {
      if (isValuated && valuationPrice) {
        finalValuationPrice = parseFloat(valuationPrice);
        finalEstimatedValue = finalValuationPrice;
      } else {
        finalEstimatedValue = calculateEstimatedValue(
          billPrice,
          year,
          condition
        );
      }
    }

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
        imageUrls: imageUrls || [],
        receiptUrl: receiptUrl || null,
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

// GET handler with filtering, sorting, and pagination
export async function GET(request: NextRequest) {
  try {
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

    const whereClause: any = {
      status: { not: "donated" },
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

    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { estimatedValue: "asc" };
    if (sort === "price_desc") orderBy = { estimatedValue: "desc" };
    if (sort === "date_asc") orderBy = { createdAt: "asc" };
    if (sort === "date_desc") orderBy = { createdAt: "desc" };

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
