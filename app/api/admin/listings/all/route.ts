// File: app/api/admin/listings/all/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    try {
        const whereClause: any = {};
        
        // ✅ UPDATED SEARCH LOGIC: Search everything
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { subCategory: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { zipCode: { contains: search, mode: 'insensitive' } },
                // Search by User Info
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [listings, total] = await prisma.$transaction([
            prisma.listing.findMany({
                where: whereClause,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { firstName: true, lastName: true, email: true }
                    }
                }
            }),
            prisma.listing.count({ where: whereClause })
        ]);

        return NextResponse.json({ 
            listings, 
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            } 
        });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}