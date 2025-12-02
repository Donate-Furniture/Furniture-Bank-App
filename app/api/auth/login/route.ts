import { NextResponse } from 'next/server';
import { comparePassword, generateToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define the POST method handler for user login
export async function POST(request: Request) {
  try {
    // 1. Parse the request payload (email and password)
    const body = await request.json();
    const { email, password } = body;

    // 2. Basic Input Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required for login.' },
        { status: 400 } // Bad Request
      );
    }

    // 3. Find the user by email in the PostgreSQL database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // 4. Handle Case: User Not Found
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email or password.' },
        { status: 401 } // Unauthorized
      );
    }

    // 5. Compare Password (Security Check)
    // Compare the submitted plain-text password against the hashed password stored in the DB
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email or password.' },
        { status: 401 } // Unauthorized
      );
    }

    // 6. Generate Authentication Token (If credentials are correct)
    const token = generateToken(user);

    // 7. Success Response
    // Send back the token and essential user data (EXCLUDING the password hash)
    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          location: user.location,
        },
      },
      { status: 200 } // OK
    );
  } catch (error) {
    // Check if the error is a known Prisma error type 
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma Login Error:', error.message);
    } else {
        console.error('Login error:', error);
    }

    // Generic error response for any internal server errors
    return NextResponse.json(
      { error: 'An unexpected server error occurred during login.' },
      { status: 500 } // Internal Server Error
    );
  }
}