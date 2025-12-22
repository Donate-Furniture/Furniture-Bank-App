// File: app/api/admin/users/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { hashPassword } from '@/lib/auth';

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
        
        if (search) {
            whereClause.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
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

// ✅ NEW: Create User (Admin Only)
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { 
            email, password, firstName, lastName, role, 
            phoneNumber, streetAddress, city, province, postalCode 
        } = body;

        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                firstName,
                lastName,
                role: role || 'USER', // Admin can assign roles
                phoneNumber, streetAddress, city, province, postalCode,
                provider: 'credentials',
            }
        });

        return NextResponse.json({ user: newUser }, { status: 201 });
    } catch (error) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}