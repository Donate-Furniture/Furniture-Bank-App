// File: app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Security: Don't reveal if user exists. Return 200 anyway.
      return NextResponse.json({ message: 'If that email exists, we sent a link.' }, { status: 200 });
    }

    if (!user.password) {
        return NextResponse.json({ error: 'This account uses Social Login (Google/Facebook). Please sign in with that provider.' }, { status: 400 });
    }

    // 2. Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const tokenExpiry = new Date(Date.now() + 3600 * 1000); 

    // 3. Save token to database (Using the existing VerificationToken model)
    // Note: We use the email as the 'identifier'
    await prisma.verificationToken.create({
        data: {
            identifier: email.toLowerCase(),
            token: resetToken,
            expires: tokenExpiry
        }
    });

    // 4. Send Email (SIMULATED)
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    
    console.log("==============================================");
    console.log("🔐 PASSWORD RESET LINK (Dev Mode):");
    console.log(resetLink);
    console.log("==============================================");

    return NextResponse.json({ message: 'Reset link sent' }, { status: 200 });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}