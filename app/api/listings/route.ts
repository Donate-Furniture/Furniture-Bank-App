// File: app/api/listings/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// ... (calculateEstimatedValue helper remains same) ...
function calculateEstimatedValue(originalPrice: number, purchaseYear: number, condition: string, category: string): number {
    if (category === 'Vehicles' && condition === 'scrap') {
        return 350;
    }
    if (originalPrice < 20) return 0;
    if (condition === 'new') return originalPrice;

    const currentYear = new Date().getFullYear();
    const age = currentYear - purchaseYear;
    let value = 0;

    if (age <= 1) value = originalPrice * 0.60;
    else if (age <= 2) value = originalPrice * 0.50;
    else value = originalPrice * 0.34;

    if (condition === 'used') value = value * 0.50;
    return Math.round(value * 100) / 100;
}

export async function POST(request: NextRequest) {
    // ... (Keep existing POST logic exactly as is) ...
    // Note: Ensure new listings are created with isApproved: false (default)
    // I am including the full POST block for safety so you don't lose previous logic.
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id; 

    try {
        const body = await request.json();
        const { 
            title, description, category, city, zipCode, imageUrls, 
            receiptUrl, valuationDocUrl, 
            subCategory, isValuated, valuationPrice,
            originalPrice, purchaseYear, condition,
            collectionDeadline 
        } = body; 

        const validImageUrls = Array.isArray(imageUrls) ? imageUrls : [];
        if (validImageUrls.length < 4) return NextResponse.json({ error: 'Please upload at least 4 photos.' }, { status: 400 });

        const deadlineDate = new Date(collectionDeadline);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 6); 
        minDate.setHours(0,0,0,0);
        deadlineDate.setHours(0,0,0,0);
        if (deadlineDate < minDate) return NextResponse.json({ error: 'Deadline too soon.' }, { status: 400 });

        const billPrice = parseFloat(originalPrice);
        const year = parseInt(purchaseYear);
        let finalEstimatedValue = 0;
        let finalValuationPrice = null;

        if (billPrice > 999) {
            if (!isValuated || !valuationPrice) return NextResponse.json({ error: 'Items > $999 require valuation.' }, { status: 400 });
            if (isValuated && (!valuationDocUrl || valuationDocUrl.length === 0)) return NextResponse.json({ error: 'Valuation document required.' }, { status: 400 });
            finalValuationPrice = parseFloat(valuationPrice);
            finalEstimatedValue = finalValuationPrice;
        } else {
            if (isValuated && valuationPrice) {
                finalValuationPrice = parseFloat(valuationPrice);
                finalEstimatedValue = finalValuationPrice;
            } else {
                finalEstimatedValue = calculateEstimatedValue(billPrice, year, condition, category);
            }
        }
        
        // Depreciation check
        const isScrapVehicle = category === 'Vehicles' && condition === 'scrap';
        if (category !== 'Antique' && !isScrapVehicle && finalEstimatedValue > billPrice) {
             return NextResponse.json({ error: 'Value cannot exceed original price.' }, { status: 400 });
        }

        const newListing = await prisma.listing.create({
            data: {
                title, description, category, subCategory: subCategory || null,
                originalPrice: billPrice, purchaseYear: year, condition, 
                isValuated: isValuated || false, valuationPrice: finalValuationPrice, estimatedValue: finalEstimatedValue,
                city, zipCode: zipCode || null, 
                imageUrls: validImageUrls, 
                receiptUrl: Array.isArray(receiptUrl) ? receiptUrl : [], 
                valuationDocUrl: Array.isArray(valuationDocUrl) ? valuationDocUrl : [],
                collectionDeadline: new Date(collectionDeadline), 
                userId, 
                // implicitly isApproved: false (default)
            },
        });
        return NextResponse.json({ message: 'Success', listing: newListing }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// ✅ GET Handler (Auto-Approve & Filter)
export async function GET(request: NextRequest) {
    try {
        // --- 1. LAZY AUTO-APPROVAL ---
        // Before fetching, check for old pending items and approve them.
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        
        await prisma.listing.updateMany({
            where: {
                isApproved: false,
                createdAt: { lt: fortyEightHoursAgo } // Created BEFORE 48 hours ago
            },
            data: {
                isApproved: true,
                approvedAt: new Date()
            }
        });

        // --- 2. Normal Fetching ---
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12'); 
        const skip = (page - 1) * limit;

        // ... (Extract filters: search, category, etc.) ...
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const city = searchParams.get('city');
        const condition = searchParams.get('condition');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const sort = searchParams.get('sort'); 

        // ✅ UPDATE: Show ONLY Approved items OR items that were just auto-approved
        const whereClause: any = {
            isApproved: true, // Only show approved items publically
            status: { not: 'donated' } // Don't show donated items
        };

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category && category !== 'All') whereClause.category = category;
        if (city) whereClause.city = { contains: city, mode: 'insensitive' };
        if (condition && condition !== 'All') whereClause.condition = condition;

        if (minPrice || maxPrice) {
            whereClause.estimatedValue = {};
            if (minPrice) whereClause.estimatedValue.gte = parseFloat(minPrice);
            if (maxPrice) whereClause.estimatedValue.lte = parseFloat(maxPrice);
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { estimatedValue: 'asc' };
        if (sort === 'price_desc') orderBy = { estimatedValue: 'desc' };
        if (sort === 'date_asc') orderBy = { createdAt: 'asc' };
        if (sort === 'date_desc') orderBy = { createdAt: 'desc' };

        const [listings, totalCount] = await prisma.$transaction([
            prisma.listing.findMany({
                where: whereClause,
                orderBy: orderBy,
                take: limit, 
                skip: skip,  
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            city: true,
                            email: true,
                        }
                    }
                }
            }),
            prisma.listing.count({ where: whereClause })
        ]);

        return NextResponse.json({ 
            listings,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Error fetching listings.' }, { status: 500 });
    }
}