// File: app/api/listings/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; 

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

// Define the PUT method handler for UPDATING a listing
export async function PUT(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    // 1. Check Session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized: You must be logged in.' }, 
            { status: 401 }
        );
    }

    const userId = (session.user as any).id;
    const listingId = params.id;

    try {
        // 2. Parse the updates from the request body
        const body = await request.json();
        const { title, description, category, price, status, city, zipCode, imageUrls,
            subCategory, isValuated, valuationPrice, originalPrice, purchaseYear, condition
        } = body;

        // 3. Verify Ownership 
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!existingListing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (existingListing.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden: You do not own this listing.' },
                { status: 403 }
            );
        }

        // 4. Update the Listing
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                title: title || undefined,
                description: description || undefined,
                category: category || undefined,
                subCategory: subCategory || undefined,
                
                // Algo fields
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                purchaseYear: purchaseYear ? parseInt(purchaseYear) : undefined,
                condition: condition || undefined,

                // Valuation
                isValuated: isValuated, // Boolean can be false, so don't use || undefined logic for it blindly if checking presence
                valuationPrice: valuationPrice ? parseFloat(valuationPrice) : undefined,
                
                // Note: We might want to re-run the calculation algorithm here if prices changed.
                // For MVP simplicity, we trust the client or leave estimatedValue as is for now.
                

                status: status || undefined, 
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
    // 1. Check Session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized: You must be logged in.' }, 
            { status: 401 }
        );
    }

    const userId = (session.user as any).id;
    const listingId = params.id;

    try {
        // 2. Verify Ownership
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (listing.userId !== userId) {
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