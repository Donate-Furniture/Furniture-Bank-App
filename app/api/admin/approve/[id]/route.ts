// File: app/api/admin/approve/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache'; // ✅ Import revalidatePath

export async function PUT(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({})); 
        const { isApproved } = body;

        // Determine the new status. If isApproved is missing, default to true (Approve).
        const statusToSet = typeof isApproved === 'boolean' ? isApproved : true;

        await prisma.listing.update({
            where: { id: params.id },
            data: { 
                isApproved: statusToSet,
                approvedAt: statusToSet ? new Date() : null 
            }
        });

        // ✅ FIX: Aggressively revalidate all related paths to clear cache
        // 1. Clear the Home Page (Recent Listings)
        revalidatePath('/'); 
        // 2. Clear the Search/Listings Page
        revalidatePath('/listings');
        // 3. Clear the specific Listing Detail Page (in case someone is looking at it)
        revalidatePath(`/listings/${params.id}`);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Admin Approve Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}