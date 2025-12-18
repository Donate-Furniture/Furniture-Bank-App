// File: app/api/admin/pending/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
    const session = await getServerSession(authOptions);
    // Security: Only allow ADMIN role
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const listings = await prisma.listing.findMany({
            where: { isApproved: false },
            orderBy: { createdAt: 'asc' }, // Oldest pending first
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true }
                }
            }
        });
        return NextResponse.json({ listings }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}