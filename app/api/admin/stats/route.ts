// File: app/api/admin/stats/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Date range for the selected year
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    try {
        const totalListings = await prisma.listing.count(); // All time count
        const totalUsers = await prisma.user.count(); // All time count

        // 1. Total Posted Value (All listings in this year)
        const postedValueAgg = await prisma.listing.aggregate({
            _sum: { estimatedValue: true },
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate
                }
            }
        });

        // 2. Total Donated Value (Listings in this year marked as 'donated')
        const donatedValueAgg = await prisma.listing.aggregate({
            _sum: { estimatedValue: true },
            where: {
                status: 'donated',
                createdAt: {
                    gte: startDate,
                    lt: endDate
                }
            }
        });

        // 3. Top Donors (Most listings posted in this year)
        const topDonors = await prisma.user.findMany({
            take: 5,
            where: {
                listings: {
                    some: {
                        createdAt: {
                            gte: startDate,
                            lt: endDate
                        }
                    }
                }
            },
            orderBy: {
                listings: { _count: 'desc' }
            },
            include: {
                _count: {
                    select: { 
                        listings: {
                            where: {
                                createdAt: {
                                    gte: startDate,
                                    lt: endDate
                                }
                            }
                        } 
                    }
                }
            }
        });

        // 4. Top Takers (Placeholder logic as DB doesn't track recipient yet)
        // Ideally, we would count listings where user is the "taker".
        // For now, returning empty array.
        const topTakers: any[] = []; 

        return NextResponse.json({
            totalListings,
            totalUsers,
            totalPostedValue: postedValueAgg._sum.estimatedValue || 0,
            totalDonatedValue: donatedValueAgg._sum.estimatedValue || 0,
            topDonors,
            topTakers
        }, { status: 200 });

    } catch (error) {
        console.error("Stats Error", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}