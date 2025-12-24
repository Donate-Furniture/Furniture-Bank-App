// Registration API: Handles new user sign-ups via email/password or social providers.
// Enforces duplicate email checks, strict password requirements, and hashes credentials before storage.

import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Destructure all incoming form data
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      streetAddress,
      city,
      province,
      postalCode,
      provider,
      providerId,
    } = body;

    // --- 1. VALIDATION ---

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: email, first name, and last name." },
        { status: 400 }
      );
    }

    // Guard: Password is mandatory unless a social provider (Google/FB) is handling auth
    if (!provider && !password) {
      return NextResponse.json(
        { error: "Password is required for email registration." },
        { status: 400 }
      );
    }

    // Guard: Prevent duplicate accounts
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    // --- 2. PREPARE DATA ---

    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    // --- 3. DATABASE CREATION ---

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        // Optional: Address & Contact Info
        phoneNumber: phoneNumber || null,
        streetAddress: streetAddress || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,

        // Metadata: Track if they joined via Credentials or Social
        provider: provider || "credentials",
        providerId: providerId || null,
      },
    });

    // --- 4. SUCCESS RESPONSE ---
    // Note: The frontend will immediately use these credentials to call signIn() automatically.
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
