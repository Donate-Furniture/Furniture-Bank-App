// User Profile API: Manages the authenticated user's personal details.
// Allows fetching full profile data (GET) and updating contact info or passwords (PUT).

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; 
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth'; // Ensure this is exported from lib/auth
import * as bcrypt from 'bcryptjs';

// Force dynamic to ensure profile data is never stale
export const dynamic = 'force-dynamic';

// --- GET: Fetch My Profile ---
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch full details for the "My Profile" page
    const fullUserProfile = await prisma.user.findUnique({
      where: {
        // @ts-ignore
        id: session.user.id, 
      },
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
        // Security: Never select the password hash
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

// --- PUT: Update Profile & Password ---
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // @ts-ignore
    const userId = session.user.id;

    try {
        const body = await request.json();
        const { 
            phoneNumber, streetAddress, city, province, postalCode, // Allowed profile fields
            currentPassword, newPassword // Password reset fields
        } = body;

        // 1. Prepare Update Data (Profile Info)
        const updateData: any = {
            phoneNumber,
            streetAddress,
            city,
            province,
            postalCode
        };

        // 2. Handle Password Change (Optional)
        // Only executes if the user is attempting to set a new password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required to set a new one.' }, { status: 400 });
            }

            // Fetch current user to get the password hash for verification
            const user = await prisma.user.findUnique({ where: { id: userId } });

            // Guard: Social login users don't have passwords to change
            if (!user || !user.password) {
                 return NextResponse.json({ error: 'Social login users cannot change passwords here.' }, { status: 403 });
            }

            // Verify old password
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
            }

            // Secure Hash: Encrypt new password before storage
            updateData.password = await hashPassword(newPassword);
        }

        // 3. Execute Update
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, firstName: true, lastName: true } // Return minimal info
        });

        return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser }, { status: 200 });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: 'Server error during update' }, { status: 500 });
    }
}