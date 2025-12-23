// File: app/api/reports/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore
    const reporterId = session.user.id;

    try {
        const body = await request.json();
        const { reason, details, listingId, targetUserId } = body;

        if (!reason) {
            return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }

        await prisma.report.create({
            data: {
                reason,
                details,
                reporterId,
                // Connect one or the other
                reportedListingId: listingId || null,
                reportedUserId: targetUserId || null,
            }
        });

        return NextResponse.json({ message: 'Report submitted successfully' }, { status: 201 });
    } catch (error) {
        console.error('Report Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}