//Input: It takes the registration data (email, password, name) from the submitted form.
//Security: It checks for existing users, hashes the password, and uses a database transaction to save the new user.
//Authentication: It immediately generates and sends back a token, which the client will use to identify the logged-in user.

import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Define the POST method handler for user registration
export async function POST(request: Request) {
  try {
    // 1. Parse the request payload (data sent from the registration form)
    const body = await request.json();
    const { email, password, name, location } = body;

    // 2. Basic Input Validation (Essential Security Step)
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, and name are required.' },
        { status: 400 }
      );
    }

    // 3. Check if the user already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 409 } // 409 Conflict status code
      );
    }

    // 4. Secure the Password
    const hashedPassword = await hashPassword(password); // Uses the utility from /lib/auth.ts

    // 5. Create the new User record in PostgreSQL using Prisma
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(), // Always store emails normalized
        password: hashedPassword,
        name,
        location: location || null, // Allow location to be null if not provided
      },
    });

    // 6. Generate Authentication Token
    // We generate the token immediately upon registration so the user is logged in right away.
    const token = generateToken(newUser);

    // 7. Success Response
    // We send back the token and basic user data (EXCLUDE THE PASSWORD HASH!)
    return NextResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          location: newUser.location,
        },
      },
      { status: 201 } // 201 Created status code
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Generic error response for any internal server errors (database, hashing, etc.)
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 } // 500 Internal Server Error
    );
  }
}