// NextAuth Configuration: Central authentication handler supporting Social Providers (Google, Facebook, Apple, Twitter) and Email/Password.
// Includes critical logic to reject banned users and persist custom user fields (role, city, etc.) into the session.

import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // --- Social Providers ---
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_SECRET || "",
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
    }),

    // --- Email/Password Logic ---
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        // 1. Guard: Reject login if user is marked as blocked in DB
        if (user.isBlocked) {
          throw new Error("Your account has been suspended. Contact support.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // Return user object to be saved in JWT
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          city: user.city,
          createdAt: user.createdAt,
          // @ts-ignore
          role: user.role,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // 2. Social Guard: Prevent blocked users from signing in via Google/FB/etc.
    async signIn({ user }) {
      if (!user.email) return false;

      // Always fetch fresh status from DB, as the social provider doesn't know about our 'isBlocked' flag
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (dbUser && dbUser.isBlocked) {
        return false; // Rejects the sign-in attempt
      }
      return true;
    },

    // 3. Token Hydration: Add custom fields (role, city) to the JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.firstName = user.firstName;
        // @ts-ignore
        token.lastName = user.lastName;
        // @ts-ignore
        token.city = user.city;
        // @ts-ignore
        token.createdAt = user.createdAt;
        // @ts-ignore
        token.role = user.role;
      }
      return token;
    },

    // 4. Session Hydration: Expose token data to the client-side `useSession()` hook
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        // @ts-ignore
        session.user.firstName = token.firstName;
        // @ts-ignore
        session.user.lastName = token.lastName;
        // @ts-ignore
        session.user.city = token.city;
        // @ts-ignore
        session.user.createdAt = token.createdAt;
        // @ts-ignore
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth", // Redirects here if signIn returns false (blocked user)
  },

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
