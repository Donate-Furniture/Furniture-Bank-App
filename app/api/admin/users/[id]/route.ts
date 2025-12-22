// File: app/api/admin/users/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { hashPassword } from '@/lib/auth';

// GET: Fetch Single User Data
export async function GET(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'info'; 
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 5; 
    const skip = (page - 1) * limit;

    try {
        if (type === 'listings') {
            const [listings, total] = await prisma.$transaction([
                prisma.listing.findMany({
                    where: { userId: params.id },
                    take: limit,
                    skip: skip,
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.listing.count({ where: { userId: params.id } })
            ]);
            return NextResponse.json({ data: listings, pagination: { total, page, totalPages: Math.ceil(total/limit) } });
        }

        if (type === 'messages') {
             const [messages, total] = await prisma.$transaction([
                prisma.message.findMany({
                    where: { OR: [{ senderId: params.id }, { recipientId: params.id }] },
                    take: limit,
                    skip: skip,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: { select: { email: true, firstName: true } },
                        recipient: { select: { email: true, firstName: true } }
                    }
                }),
                prisma.message.count({ where: { OR: [{ senderId: params.id }, { recipientId: params.id }] } })
            ]);
            return NextResponse.json({ data: messages, pagination: { total, page, totalPages: Math.ceil(total/limit) } });
        }

        const user = await prisma.user.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { listings: true, sentMessages: true, receivedMessages: true }
                }
            }
        });
        return NextResponse.json({ user });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


//DELETE (Remove User)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Prevent deleting self
        // @ts-ignore
        if (params.id === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}