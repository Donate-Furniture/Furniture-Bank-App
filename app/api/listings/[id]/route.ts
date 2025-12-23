// File: app/api/listings/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; 

// Define the GET method handler
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
                }
            }
        });
        if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ listing }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ✅ PUT Handler (With strict valuation logic)
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
            status, city, zipCode, imageUrls,
            originalPrice, purchaseYear, condition,
            isValuated, valuationPrice, collectionDeadline
        } = body; 

        // 1. Fetch Existing Listing
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!existingListing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

        // 2. Ownership Check
        if (existingListing.userId !== userId && userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Date Validation (If changing deadline)
        let validatedDeadline: Date | undefined = undefined;
        if (collectionDeadline) {
             const deadlineDate = new Date(collectionDeadline);
             const minDate = new Date();
             minDate.setDate(minDate.getDate() + 6); 
             minDate.setHours(0,0,0,0);
             if (deadlineDate < minDate) {
                return NextResponse.json({ error: 'Deadline too soon.' }, { status: 400 });
             }
             validatedDeadline = new Date(collectionDeadline);
        }

        // 4. ✅ LOGIC VALIDATION: Check Price vs Original (Depreciation Rule)
        
        // We need to know the FINAL state of these fields (New Value OR Existing Value)
        const checkCategory = category || existingListing.category;
        const checkCondition = condition || existingListing.condition;
        
        const checkOriginalPrice = originalPrice !== undefined 
            ? parseFloat(originalPrice) 
            : existingListing.originalPrice;

        // Determine the final Estimated/Valuation Value
        let checkEstimatedValue = existingListing.estimatedValue;

        // If user provided a new valuation price, use it. 
        // Otherwise, if they changed inputs that affect the algorithm, we should ideally re-calculate, 
        // but for a simple edit, we often assume the value passed in (if any) or the existing one.
        if (isValuated && valuationPrice) {
            checkEstimatedValue = parseFloat(valuationPrice);
        }

        // THE CHECK:
        // If Category is NOT Antique, and NOT Scrap...
        // ...The Value cannot be higher than the Bill Price.
        const isScrap = checkCategory === 'Vehicles' && checkCondition === 'scrap';
        
        if (
            checkCategory !== 'Antique' && 
            !isScrap && 
            checkEstimatedValue !== null && 
            checkEstimatedValue > checkOriginalPrice
        ) {
            return NextResponse.json({ 
                error: 'For non-antiques, the valuation cannot exceed the original bill price.' 
            }, { status: 400 });
        }

        // 5. Update
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
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
                // Update estimated value if valuation provided override
                estimatedValue: (isValuated && valuationPrice) ? parseFloat(valuationPrice) : undefined
            },
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

// DELETE Handler
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