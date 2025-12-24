// Password Reset Request API: Validates email existence and generates secure, time-limited verification tokens.
// Includes checks for social-login users and simulates email sending for development purposes.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Lookup User
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // 2. Security Masking: If user doesn't exist, return success anyway to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json(
        { message: "If that email exists, we sent a link." },
        { status: 200 }
      );
    }

    // 3. Social Login Guard: Prevent password resets for Google/Facebook accounts (they don't have passwords)
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "This account uses Social Login (Google/Facebook). Please sign in with that provider.",
        },
        { status: 400 }
      );
    }

    // 4. Token Generation: Create a cryptographically strong random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    // Token expires in 1 hour
    const tokenExpiry = new Date(Date.now() + 3600 * 1000);

    // 5. Store Token: Uses the standard NextAuth 'VerificationToken' model
    // We use the email as the identifier to link it back to the user later
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: resetToken,
        expires: tokenExpiry,
      },
    });

    // 6. Send Email (SIMULATED): In production, replace this with Resend/SendGrid/Nodemailer
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    console.log("==============================================");
    console.log("🔐 PASSWORD RESET LINK (Dev Mode):");
    console.log(resetLink);
    console.log("==============================================");

    return NextResponse.json({ message: "Reset link sent" }, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
