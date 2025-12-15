// File: app/api/listings/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// --- HELPER: Pricing Algorithm ---
function calculateEstimatedValue(originalPrice: number, purchaseYear: number, condition: string): number {
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

// POST Handler (Create Listing)
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id; 

    try {
        const body = await request.json();
        const { 
            title, description, category, city, zipCode, imageUrls, 
            receiptUrl, valuationDocUrl, // Arrays
            subCategory, isValuated, valuationPrice,
            originalPrice, purchaseYear, condition,
            collectionDeadline 
        } = body; 

        // --- 1. Validate Images ---
        // Ensure imageUrls is an array and has at least 4 items
        const validImageUrls = Array.isArray(imageUrls) ? imageUrls : [];
        if (validImageUrls.length < 4) {
            return NextResponse.json({ error: 'Please upload at least 4 photos of the item.' }, { status: 400 });
        }

        // --- 2. Validate Date ---
        if (!collectionDeadline) {
             return NextResponse.json({ error: 'Collection deadline is required.' }, { status: 400 });
        }
        const deadlineDate = new Date(collectionDeadline);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 6); // Allow slight buffer for timezones (approx 1 week)
        minDate.setHours(0,0,0,0);
        deadlineDate.setHours(0,0,0,0);

        if (deadlineDate < minDate) {
             return NextResponse.json({ error: 'Collection deadline must be at least 1 week from today.' }, { status: 400 });
        }

        // --- 3. Parse & Validate Numbers ---
        const billPrice = parseFloat(originalPrice);
        const year = parseInt(purchaseYear);

        if (isNaN(billPrice) || isNaN(year)) {
             return NextResponse.json({ error: 'Invalid price or year format.' }, { status: 400 });
        }

        // --- 4. Algorithm Logic ---
        let finalEstimatedValue = 0;
        let finalValuationPrice = null;

        // Ensure array safety for valuation docs
        const validValuationDocs = Array.isArray(valuationDocUrl) ? valuationDocUrl : [];

        if (billPrice > 999) {
            if (!isValuated || !valuationPrice) {
                return NextResponse.json({ error: 'Items > $999 require valuation.' }, { status: 400 });
            }
            if (isValuated && validValuationDocs.length === 0) {
                 return NextResponse.json({ error: 'Please upload at least one valuation document.' }, { status: 400 });
            }
            finalValuationPrice = parseFloat(valuationPrice);
            finalEstimatedValue = finalValuationPrice;
        } else {
            if (isValuated && valuationPrice) {
                finalValuationPrice = parseFloat(valuationPrice);
                finalEstimatedValue = finalValuationPrice;
            } else {
                finalEstimatedValue = calculateEstimatedValue(billPrice, year, condition);
            }
        }

        // --- 5. Create in Database ---
        const newListing = await prisma.listing.create({
            data: {
                title, 
                description, 
                category, 
                subCategory: subCategory || null,
                
                originalPrice: billPrice, 
                purchaseYear: year, 
                condition, 
                
                isValuated: isValuated || false, 
                valuationPrice: finalValuationPrice, 
                estimatedValue: finalEstimatedValue,
                
                city, 
                zipCode: zipCode || null, 
                
                // ✅ SAFETY: Ensure these are always arrays, never null
                imageUrls: validImageUrls, 
                receiptUrl: Array.isArray(receiptUrl) ? receiptUrl : [], 
                valuationDocUrl: validValuationDocs,
                
                collectionDeadline: new Date(collectionDeadline), 
                userId, 
            },
        });
        return NextResponse.json({ message: 'Success', listing: newListing }, { status: 201 });

    } catch (error: any) {
        //LOGGING: This will show up in your VS Code terminal
        console.error('❌ Error creating listing:', error);
        return NextResponse.json({ error: 'Server Error: ' + (error.message || 'Unknown') }, { status: 500 });
    }
}

// GET Handler (Public Search) - Updated to show everything
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12'); 
        const skip = (page - 1) * limit;

        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const city = searchParams.get('city');
        const condition = searchParams.get('condition');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const sort = searchParams.get('sort'); 

        const whereClause: any = {}; 

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