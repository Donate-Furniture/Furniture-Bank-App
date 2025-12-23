// File: app/api/admin/reports/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

// GET: Fetch all reports
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const reports = await prisma.report.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: { select: { firstName: true, lastName: true, email: true } },
                reportedListing: { select: { id: true, title: true } },
                reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            }
        });

        return NextResponse.json({ reports }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// PUT: Update Report Status (Resolve/Dismiss)
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, status } = body; // id = reportId, status = 'resolved' | 'dismissed'

        await prisma.report.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}