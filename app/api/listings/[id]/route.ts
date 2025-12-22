// File: app/api/listings/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// Define the GET method handler to fetch a single listing by ID
// GET, PUT, DELETE for a listing happens here.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const listingId = params.id;

  try {
    const listing = await prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
            email: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: `Listing with ID ${listingId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ listing }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching listing ${listingId}:`, error);
    return NextResponse.json(
      {
        error:
          "An unexpected server error occurred while fetching the listing.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    // @ts-ignore
    const userRole = session.user.role; // Get Role
    const listingId = params.id;

    try {
        const body = await request.json();
        // Extract EVERYTHING (Admin might edit price/category)
        const { 
            title, description, category, subCategory,
            price, status, city, zipCode, imageUrls,
            originalPrice, purchaseYear, condition,
            isValuated, valuationPrice, collectionDeadline
        } = body; 

        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!existingListing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        // ✅ SECURITY CHECK: Allow if Owner OR Admin
        if (existingListing.userId !== userId && userRole !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden: You do not own this listing.' },
                { status: 403 }
            );
        }

        // Validate Date if changed
        let validatedDeadline: Date | undefined = undefined;
        if (collectionDeadline) {
             const deadlineDate = new Date(collectionDeadline);
             const minDate = new Date();
             minDate.setDate(minDate.getDate() + 6); 
             minDate.setHours(0,0,0,0);
             deadlineDate.setHours(0,0,0,0);

             if (deadlineDate < minDate) {
                return NextResponse.json({ error: 'Deadline too soon.' }, { status: 400 });
             }
             validatedDeadline = new Date(collectionDeadline);
        }

        // Update
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                title: title || undefined,
                description: description || undefined,
                status: status || undefined, 
                city: city || undefined,
                zipCode: zipCode || undefined,
                collectionDeadline: validatedDeadline,
                
                // ✅ ADMIN ONLY FIELDS (But logic allows passing them if authorized)
                // Since we checked role above, we can safely update these if provided
                category: category || undefined,
                subCategory: subCategory || undefined,
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                purchaseYear: purchaseYear ? parseInt(purchaseYear) : undefined,
                condition: condition || undefined,
                isValuated: isValuated, // Boolean
                valuationPrice: valuationPrice ? parseFloat(valuationPrice) : undefined,
                // Note: estimatedValue logic might need re-run if price changed, 
                // but for Admin edits we usually trust the input or keep as is.
            },
        });

        return NextResponse.json(
            { message: 'Listing updated', listing: updatedListing }, 
            { status: 200 }
        );

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE Handler (Admin Override)
export async function DELETE(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    // @ts-ignore
    const userRole = session.user.role;
    const listingId = params.id;

    try {
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // ✅ SECURITY CHECK: Allow if Owner OR Admin
        if (listing.userId !== userId && userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.listing.delete({ where: { id: listingId } });
        return NextResponse.json({ message: 'Deleted' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}