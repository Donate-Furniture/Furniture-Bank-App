// File: app/api/listings/mine/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
    // 1. Check Session (Server-Side Protection)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized: You must be logged in.' }, 
            { status: 401 }
        );
    }

    // Safely extract User ID from the session
    // Note: We ensured 'id' exists in the session callback in [...nextauth]/route.ts
    const userId = (session.user as any).id;

    try {
        // 2. Fetch listings filtered by the session user's ID
        const userListings = await prisma.listing.findMany({
            where: {
                userId: userId, 
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        location: true, // Legacy field
                        city: true,     // New field
                        email: true,
                    }
                }
            }
        });

        return NextResponse.json(
            { listings: userListings },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error fetching user listings:', error);
        return NextResponse.json(
            { error: 'An unexpected server error occurred.' },
            { status: 500 }
        );
    }
}