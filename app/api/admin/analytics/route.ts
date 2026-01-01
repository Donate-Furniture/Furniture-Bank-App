import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
// Adjust the path to your auth options if needed
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year'); // 'all', '2024', '2025' etc.
    
    // --- 1. Build Date Filters ---
    let createdFilter: any = {}; 
    let donatedFilter: any = {}; 
    
    if (yearParam && yearParam !== 'all') {
        const year = parseInt(yearParam);
        if (!isNaN(year)) {
            const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
            const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
            
            // Filter for items POSTED in this year
            createdFilter = { createdAt: { gte: startDate, lt: endDate } };
            
            // Filter for items DONATED in this year
            // Logic: Use 'donatedAt' if present. Fallback to 'updatedAt' if migrated from old schema.
            donatedFilter = {
                OR: [
                    { donatedAt: { gte: startDate, lt: endDate } },
                    { donatedAt: null, updatedAt: { gte: startDate, lt: endDate } }
                ]
            };
        }
    }
    // If yearParam is 'all' or missing, filters remain empty (Total History)

    try {
        // --- 2. Financial Overview ---
        
        // Total Value Posted (Everything created in the period)
        const postedValueAgg = await prisma.listing.aggregate({
            _sum: { estimatedValue: true },
            where: { ...createdFilter }
        });

        // Total Value Donated (Everything marked donated in the period)
        const donatedValueAgg = await prisma.listing.aggregate({
            _sum: { estimatedValue: true },
            where: { 
                status: 'donated',
                ...donatedFilter
            }
        });

        // --- 3. Inventory Counts ---
        
        // How many active listings posted in this period?
        const availableListingsCount = await prisma.listing.count({
            where: { status: 'available', ...createdFilter }
        });

        // How many listings donated in this period?
        const donatedListingsCount = await prisma.listing.count({
            where: { status: 'donated', ...donatedFilter }
        });

        // --- 4. Leaderboards ---

        // Top Donors (Users who POSTED the most items in this period)
        const topDonorsGroup = await prisma.listing.groupBy({
            by: ['userId'],
            _count: { userId: true },
            where: { ...createdFilter },
            orderBy: { _count: { userId: 'desc' } },
            take: 5
        });

        // Hydrate Top Donors with User Details
        const topDonors = await Promise.all(topDonorsGroup.map(async (item) => {
            const user = await prisma.user.findUnique({
                where: { id: item.userId },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            if (!user) return null; // Handle deleted users safely
            return {
                ...user,
                _count: { listings: item._count.userId }
            };
        }));

        // Top Recipients/Takers (Users who RECEIVED the most items in this period)
        const topTakersGroup = await prisma.listing.groupBy({
            by: ['recipientId'],
            _count: { recipientId: true },
            where: { 
                status: 'donated', 
                recipientId: { not: null },
                ...donatedFilter
            },
            orderBy: { _count: { recipientId: 'desc' } },
            take: 5
        });

        // Hydrate Top Takers with User Details
        const topTakers = await Promise.all(topTakersGroup.map(async (item) => {
            if (!item.recipientId) return null;
            const user = await prisma.user.findUnique({
                where: { id: item.recipientId },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            if (!user) return null;
            return {
                ...user,
                _count: { receivedListings: item._count.recipientId }
            };
        }));

        // --- 5. Return Data ---
        return NextResponse.json({
            totalPostedValue: postedValueAgg._sum.estimatedValue || 0,
            totalDonatedValue: donatedValueAgg._sum.estimatedValue || 0,
            availableListingsCount,
            donatedListingsCount,
            topDonors: topDonors.filter(Boolean), // Filter out nulls
            topTakers: topTakers.filter(Boolean)  // Filter out nulls
        }, { status: 200 });

    } catch (error) {
        console.error("Analytics Calculation Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}