// File: app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // 1. Total Counts
        const totalListings = await prisma.listing.count();
        const totalUsers = await prisma.user.count();

        // 2. Total Value (Sum of estimatedValue)
        const valueAgg = await prisma.listing.aggregate({
            _sum: { estimatedValue: true }
        });

        // 3. Top Donors (Group by User)
        const topDonors = await prisma.user.findMany({
            take: 5,
            orderBy: {
                listings: { _count: 'desc' }
            },
            include: {
                _count: {
                    select: { listings: true }
                }
            }
        });

        return NextResponse.json({
            totalListings,
            totalUsers,
            totalValue: valueAgg._sum.estimatedValue || 0,
            topDonors
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}