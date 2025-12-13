// File: lib/auth.ts
import * as bcrypt from "bcryptjs";

// --- Password Utilities ---

/**
 * Hashes a plain-text password for secure storage.
 * Used during Registration.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Note: comparePassword is technically not needed here anymore
// because NextAuth handles comparison inside the [...nextauth] route,
// but keeping it doesn't hurt.
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
