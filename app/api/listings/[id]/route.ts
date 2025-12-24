// Listing Details API: Handles retrieval, updates, and deletion of individual listings.
// Enforces business rules regarding valuation caps (depreciation) and collection deadlines.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// --- GET: Fetch Single Listing ---
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const listingId = params.id;
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            city: true,
          },
        },
      },
    });
    if (!listing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ listing }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- PUT: Update Listing (With Business Logic) ---
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Security Guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  // @ts-ignore
  const userRole = session.user.role;
  const listingId = params.id;

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      subCategory,
      status,
      city,
      zipCode,
      imageUrls,
      originalPrice,
      purchaseYear,
      condition,
      isValuated,
      valuationPrice,
      collectionDeadline,
    } = body;

    // 2. Fetch Existing & Verify Ownership
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing)
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    if (existingListing.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Date Validation: Deadline must be reasonable (e.g., > 6 days)
    let validatedDeadline: Date | undefined = undefined;
    if (collectionDeadline) {
      const deadlineDate = new Date(collectionDeadline);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 6);
      minDate.setHours(0, 0, 0, 0);
      if (deadlineDate < minDate) {
        return NextResponse.json(
          { error: "Deadline too soon." },
          { status: 400 }
        );
      }
      validatedDeadline = new Date(collectionDeadline);
    }

    // 4. Valuation Safeguard: Prevent price inflation
    // We compare the final proposed value against the original bill price.

    // Resolve final values (New Input vs Existing DB Value)
    const checkCategory = category || existingListing.category;
    const checkCondition = condition || existingListing.condition;

    const checkOriginalPrice =
      originalPrice !== undefined
        ? parseFloat(originalPrice)
        : existingListing.originalPrice;

    let checkEstimatedValue = existingListing.estimatedValue;

    // If user is manually setting a valuation, use that for the check
    if (isValuated && valuationPrice) {
      checkEstimatedValue = parseFloat(valuationPrice);
    }

    // RULE: Unless it's an Antique or Scrap vehicle, Value <= Original Price
    const isScrap = checkCategory === "Vehicles" && checkCondition === "scrap";

    if (
      checkCategory !== "Antique" &&
      !isScrap &&
      checkEstimatedValue !== null &&
      checkEstimatedValue > checkOriginalPrice
    ) {
      return NextResponse.json(
        {
          error:
            "For non-antiques, the valuation cannot exceed the original bill price.",
        },
        { status: 400 }
      );
    }

    // 5. Execute Update
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title: title || undefined,
        description: description || undefined,
        status: status || undefined,
        city: city || undefined,
        zipCode: zipCode || undefined,
        collectionDeadline: validatedDeadline,

        category: category || undefined,
        subCategory: subCategory || undefined,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        purchaseYear: purchaseYear ? parseInt(purchaseYear) : undefined,
        condition: condition || undefined,
        isValuated: isValuated,
        valuationPrice: valuationPrice ? parseFloat(valuationPrice) : undefined,
        // Sync estimated value if explicitly provided
        estimatedValue:
          isValuated && valuationPrice ? parseFloat(valuationPrice) : undefined,
      },
    });

    return NextResponse.json(
      { message: "Listing updated", listing: updatedListing },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- DELETE: Remove Listing ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  // @ts-ignore
  const userRole = session.user.role;
  const listingId = params.id;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Security: Only Owner or Admin can delete
    if (listing.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.listing.delete({ where: { id: listingId } });
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
