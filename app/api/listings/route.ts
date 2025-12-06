// File: app/api/listings/route.ts
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth'; // Import NextAuth session handler
import { authOptions } from '../auth/[...nextauth]/route'; // Import auth config

// --- HELPER: The Pricing Algorithm (Remains the same) ---
function calculateEstimatedValue(originalPrice: number, purchaseYear: number, condition: string): number {
    if (originalPrice < 20) return 0;

    const currentYear = new Date().getFullYear();
    const age = currentYear - purchaseYear;
    let value = 0;

    if (age <= 1) {
        value = originalPrice * 0.60;
    } else if (age <= 2) {
        value = originalPrice * 0.50;
    } else {
        value = originalPrice * 0.34;
    }

    if (condition === 'well_used') {
        value = value * 0.50;
    }

    return Math.round(value * 100) / 100;
}

// Define the POST method handler for creating a new listing
export async function POST(request: NextRequest) {
    // 1. Check Session (Server-Side Protection)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized: You must be logged in.' }, 
            { status: 401 }
        );
    }

    // Safely extract User ID from the session
    // Note: We ensured 'id' exists in the session callback in [...nextauth]/route.ts
    const userId = (session.user as any).id;

    try {
        const body = await request.json();
        // Extract new fields
        const { 
            title, description, category, city, zipCode, imageUrls, 
            subCategory, isValuated, valuationPrice,
            originalPrice, purchaseYear, condition 
        } = body; 

        // Validation
        if (!title || !originalPrice || !purchaseYear || !condition) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const billPrice = parseFloat(originalPrice);
        const year = parseInt(purchaseYear);

        // --- ALGORITHM LOGIC ---
        let finalEstimatedValue = 0;
        let finalValuationPrice = null;

        if (billPrice > 650) {
            if (!isValuated || !valuationPrice) {
                return NextResponse.json(
                    { error: 'Items with a bill price over $650 require a professional valuation.' },
                    { status: 400 }
                );
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
                imageUrls: imageUrls || [],
                userId: userId, 
            },
        });

        return NextResponse.json({ message: 'Listing created successfully.', listing: newListing }, { status: 201 });

    } catch (error) {
        console.error('Error creating listing:', error);
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
    }
}

// GET Handler (Public - No Auth Required)
export async function GET(request: NextRequest) {
    try {
        const listings = await prisma.listing.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        location: true,
                        city: true, // Return city if available
                        email: true,
                    }
                }
            }
        });
        return NextResponse.json({ listings }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching listings.' }, { status: 500 });
    }
}