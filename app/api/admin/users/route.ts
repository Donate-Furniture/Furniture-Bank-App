// File: app/api/admin/users/route.ts
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    try {
        const whereClause: any = {};
        
        // ✅ UPDATED SEARCH LOGIC: Search everything
        if (search) {
            whereClause.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { streetAddress: { contains: search, mode: 'insensitive' } },
                { province: { contains: search, mode: 'insensitive' } },
                { postalCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where: whereClause,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { listings: true }
                    }
                }
            }),
            prisma.user.count({ where: whereClause })
        ]);

        return NextResponse.json({ 
            users, 
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