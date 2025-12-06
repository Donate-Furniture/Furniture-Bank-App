// File: app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth'; 
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Destructure all the fields from the form
    const { 
        email, password, firstName, lastName, 
        phoneNumber, streetAddress, city, province, postalCode, 
        provider, providerId 
    } = body;

    // --- 1. VALIDATION ---
    
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, first name, and last name.' },
        { status: 400 }
      );
    }

    // Strict Password Check: If not a social login, password is required
    if (!provider && !password) {
        return NextResponse.json(
            { error: 'Password is required for email registration.' },
            { status: 400 }
        );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    }

    // --- 2. PREPARE DATA ---

    let hashedPassword = null;
    if (password) {
        hashedPassword = await hashPassword(password);
    }

    // --- 3. CREATE USER IN DATABASE ---

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        // Save Address & Contact Info
        phoneNumber: phoneNumber || null,
        streetAddress: streetAddress || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        
        // Save Provider Metadata
        provider: provider || 'credentials',
        providerId: providerId || null,
      },
    });

    // --- 4. RESPONSE ---
    
    // The frontend will receive this 201 OK, and then immediately call 
    // signIn('credentials') from NextAuth to create the session.

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error during registration.' }, { status: 500 });
  }
}