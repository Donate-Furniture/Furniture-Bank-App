// File: app/api/user/me/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; // Adjust path if needed
import prisma from '@/lib/prisma';

export async function GET() {
  // 1. Verify the session
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch the FULL user data from PostgreSQL
  try {
    const fullUserProfile = await prisma.user.findUnique({
      where: {
        // @ts-ignore: We know ID is in the session because of our callbacks
        id: session.user.id, 
      },
      // Select ONLY what you want to expose to the frontend
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        streetAddress: true,
        city: true,
        province: true,
        postalCode: true,
        createdAt: true,
        // DO NOT select password or providerId
      }
    });

    if (!fullUserProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: fullUserProfile }, { status: 200 });

  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}