import { NextResponse, NextRequest } from 'next/server';
import { authenticate, AuthenticatedRequest } from '@/lib/middlewares/authMiddleware';
import prisma from '@/lib/prisma';

// Define the POST method handler for creating a new listing
export async function POST(request: NextRequest) {
    // 1. Run the Authentication Middleware
    // The middleware checks the JWT and returns [user, error_response]
    const [authenticatedRequest, response] = await authenticate(request);

    // If authentication failed, stop here and return the error response immediately.
    if (response) {
        return response; // Returns 401 Unauthorized error
    }

    // Now we know the user is logged in, and their data is attached to the request
    const req = authenticatedRequest as AuthenticatedRequest;

    // We can safely extract the user ID
    const userId = req.user!.id; 

    try {
        // 2. Parse the listing data payload
        const body = await req.json();
        const { title, description, category, price, city, zipCode, imageUrls } = body;

        // 3. Simple Validation (ensure required fields are present)
        if (!title || !description || !category || !city || !imageUrls || imageUrls.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields for listing (title, description, category, city, and at least one image).' },
                { status: 400 }
            );
        }

        // 4. Create the new Listing record in PostgreSQL using Prisma
        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                category,
                price: price ? parseFloat(price) : null, // Convert price to Float or set to null
                city,
                zipCode: zipCode || null,
                imageUrls: imageUrls || [],
                // Crucially, link the listing to the authenticated user ID
                userId: userId, 
            },
        });

        // 5. Success Response
        return NextResponse.json(
            {
                message: 'Listing created successfully.',
                listing: newListing,
            },
            { status: 201 } // 201 Created
        );

    } catch (error) {
        console.error('Error creating listing:', error);
        return NextResponse.json(
            { error: 'An unexpected server error occurred while creating the listing.' },
            { status: 500 }
        );
    }
}

// ----------------------------------------------------
// NOTE: We do not define GET, PUT, or DELETE here yet.
// Those will be added later when we build the search/filter features.
// ----------------------------------------------------