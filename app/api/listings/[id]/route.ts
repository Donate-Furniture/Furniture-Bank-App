import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
// Adjust path to auth options if necessary
import { authOptions } from "@/lib/auth";

// --- GET: Fetch Single Listing ---
export async function GET(
    request: NextRequest, 
    { params }: { params: { id: string } } 
) {
    const listingId = params.id;
    try {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                user: {
                    select: {
                        id: true, firstName: true, lastName: true, email: true, city: true
                    }
                },
                recipient: {
                    select: {
                        id: true, firstName: true, lastName: true
                    }
                }
            }
        });
        if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ listing }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// --- PUT: Update Listing ---
export async function PUT(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    // @ts-ignore
    const userRole = session.user.role;
    const listingId = params.id;

    try {
        const body = await request.json();
        const { 
            title, description, category, subCategory,
            status, city, zipCode, imageUrls, receiptUrl,
            originalPrice, purchaseYear, condition,
            isValuated, valuationPrice, collectionDeadline,
            recipientId
        } = body; 

        // 1. Verify Ownership
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!existingListing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

        if (existingListing.userId !== userId && userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Date Validation (Skip for Admin)
        let validatedDeadline: Date | undefined = undefined;
        if (collectionDeadline) {
             const deadlineDate = new Date(collectionDeadline);
             const minDate = new Date();
             minDate.setDate(minDate.getDate() + 6); 
             minDate.setHours(0,0,0,0);
             
             if (userRole !== 'ADMIN' && deadlineDate < minDate) {
                return NextResponse.json({ error: 'Deadline too soon.' }, { status: 400 });
             }
             validatedDeadline = new Date(collectionDeadline);
        }

        // 3. Valuation Logic
        const checkCategory = category || existingListing.category;
        const checkCondition = condition || existingListing.condition;
        const checkOriginalPrice = originalPrice !== undefined ? parseFloat(originalPrice) : existingListing.originalPrice;
        let checkEstimatedValue = existingListing.estimatedValue;

        if (isValuated && valuationPrice) {
            checkEstimatedValue = parseFloat(valuationPrice);
        }

        const isScrap = checkCategory === 'Vehicles' && checkCondition === 'scrap';
        
        if (
            userRole !== 'ADMIN' && 
            checkCategory !== 'Antique' && 
            !isScrap && 
            checkEstimatedValue !== null && 
            checkEstimatedValue > checkOriginalPrice
        ) {
            return NextResponse.json({ 
                error: 'For non-antiques, the valuation cannot exceed the original bill price.' 
            }, { status: 400 });
        }

        // 4. Determine Data for Update
        const updateData: any = {
            title: title || undefined,
            description: description || undefined,
            status: status || undefined, 
            city: city || undefined,
            zipCode: zipCode || undefined,
            collectionDeadline: validatedDeadline,
            category: category || undefined,
            subCategory: subCategory || undefined,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            purchaseYear: purchaseYear ? parseInt(purchaseYear) : undefined,
            condition: condition || undefined,
            isValuated: isValuated, 
            valuationPrice: valuationPrice ? parseFloat(valuationPrice) : undefined,
            estimatedValue: (isValuated && valuationPrice) ? parseFloat(valuationPrice) : undefined,
            imageUrls: imageUrls || undefined,
            receiptUrl: receiptUrl || undefined,
        };

        // ✅ CRITICAL FIX: Save 'donatedAt' and 'recipientId'
        if (status === 'donated') {
            updateData.recipientId = recipientId || undefined;
            updateData.donatedAt = new Date(); // <--- This line is key!
        } else if (status && status !== 'donated') {
            updateData.recipientId = null;
            updateData.donatedAt = null; 
        }

        // 5. Execute Update
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: updateData,
        });

        return NextResponse.json(
            { message: 'Listing updated', listing: updatedListing }, 
            { status: 200 }
        );

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// --- DELETE: Remove Listing ---
export async function DELETE(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    // @ts-ignore
    const userRole = session.user.role;
    const listingId = params.id;

    try {
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (listing.userId !== userId && userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.listing.delete({ where: { id: listingId } });
        return NextResponse.json({ message: 'Deleted' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}