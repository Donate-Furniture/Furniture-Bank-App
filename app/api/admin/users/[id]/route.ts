import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

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
    const type = searchParams.get('type') || 'info'; // info, listings, messages
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 5; // Smaller limit for sub-lists
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
             // Fetch messages sent OR received
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

        // Default: Basic Info
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