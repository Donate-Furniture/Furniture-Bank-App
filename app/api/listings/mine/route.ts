// File: app/api/listings/mine/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { authenticate, AuthenticatedRequest } from '@/lib/middlewares/authMiddleware';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define the GET method handler for fetching ONLY the listings belonging to the authenticated user
export async function GET(request: NextRequest) {
    // 1. Run Authentication Middleware (MUST be logged in)
    const [authenticatedRequest, response] = await authenticate(request);

    // If authentication failed, stop here and return the error response immediately.
    if (response) {
        return response; // Returns 401 Unauthorized error
    }

    // Safely retrieve the verified user ID from the request object
    const userId = (authenticatedRequest as AuthenticatedRequest).user!.id; 

    try {
        // 2. Fetch listings filtered by the authenticated user's ID
        const userListings = await prisma.listing.findMany({
            where: {
                userId: userId, // CRITICAL: Filter by the authenticated user's ID
            },
            orderBy: {
                createdAt: 'desc',
            },
            // We still include user details to maintain consistency with the Listing type
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        location: true,
                        email: true,
                    }
                }
            }
        });

        // 3. Success Response
        return NextResponse.json(
            { listings: userListings },
            { status: 200 } // OK
        );

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error('Prisma Error fetching user listings:', error.message);
        } else {
            console.error('Error fetching user listings:', error);
        }
        return NextResponse.json(
            { error: 'An unexpected server error occurred while fetching your listings.' },
            { status: 500 } // Internal Server Error
        );
    }
}