import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, AuthenticatedRequest } from '@/lib/middlewares/authMiddleware'; // Import Auth Middleware

// Define the GET method handler to fetch a single listing by ID
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
                        location: true,
                        email: true, 
                    }
                }
            }
        });

        if (!listing) {
            return NextResponse.json(
                { error: `Listing with ID ${listingId} not found.` },
                { status: 404 } 
            );
        }

        return NextResponse.json(
            { listing },
            { status: 200 } 
        );

    } catch (error) {
        console.error(`Error fetching listing ${listingId}:`, error);
        return NextResponse.json(
            { error: 'An unexpected server error occurred while fetching the listing.' },
            { status: 500 } 
        );
    }
}

// PUT method handler for UPDATING a listing
export async function PUT(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    // 1. Authenticate the user
    const [authenticatedRequest, response] = await authenticate(request);
    if (response) return response;

    const user = (authenticatedRequest as AuthenticatedRequest).user!;
    const listingId = params.id;

    try {
        // 2. Parse the updates from the request body
        const body = await request.json();
        const { title, description, category, price, status, city, zipCode, imageUrls } = body;

        // 3. Verify Ownership (Fetch existing listing first)
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!existingListing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (existingListing.userId !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden: You do not own this listing.' },
                { status: 403 }
            );
        }

        // 4. Update the Listing
        // We check if fields are provided; if not, they are ignored (undefined) to keep existing values.
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                title: title || undefined,
                description: description || undefined,
                category: category || undefined,
                price: price !== undefined ? parseFloat(price) : undefined,
                status: status || undefined, // Allow updating status (e.g., to 'sold')
                city: city || undefined,
                zipCode: zipCode || undefined,
                imageUrls: imageUrls || undefined,
            },
        });

        return NextResponse.json(
            { message: 'Listing updated successfully', listing: updatedListing }, 
            { status: 200 }
        );

    } catch (error) {
        console.error('Error updating listing:', error);
        return NextResponse.json(
            { error: 'Server error while updating listing.' },
            { status: 500 }
        );
    }
}

// Define the DELETE method handler
export async function DELETE(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    // 1. Authenticate the user
    const [authenticatedRequest, response] = await authenticate(request);
    if (response) return response;

    const user = (authenticatedRequest as AuthenticatedRequest).user!;
    const listingId = params.id;

    try {
        // 2. Verify Ownership
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (listing.userId !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden: You do not own this listing.' },
                { status: 403 }
            );
        }

        // 3. Delete the Listing
        await prisma.listing.delete({
            where: { id: listingId },
        });

        return NextResponse.json({ message: 'Listing deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error deleting listing:', error);
        return NextResponse.json(
            { error: 'Server error while deleting listing.' },
            { status: 500 }
        );
    }
}