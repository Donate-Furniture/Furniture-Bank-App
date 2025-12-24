// Password Reset Completion API: Finalizes the account recovery process.
// Verifies the secure token, updates the user's credentials, and invalidates the token to prevent reuse.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // 1. Verify Token
    // We check for a token that exists AND is not expired
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: token,
        expires: { gt: new Date() }, // Expiry must be in the future
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    // 2. Secure Update: Hash the new password before storing
    const hashedPassword = await hashPassword(password);

    // 3. Update User Credentials
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { password: hashedPassword },
    });

    // 4. Cleanup: Delete the used token immediately (One-time use policy)
    // We use the compound unique key (identifier_token) to delete the specific entry
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: token,
        },
      },
    });

    return NextResponse.json({ message: "Password updated" }, { status: 200 });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
