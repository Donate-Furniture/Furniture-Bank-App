// File: app/api/auth/[...nextauth]/route.ts
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
    
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        // ✅ CHECK BLOCK STATUS (Email Login)
        if (user.isBlocked) {
            throw new Error("Your account has been suspended. Contact support.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

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
      }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // ✅ CHECK BLOCK STATUS (Social Login)
    async signIn({ user }) {
        if (!user.email) return false;
        
        // Fetch fresh user data from DB to check status
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });

        if (dbUser && dbUser.isBlocked) {
            return false; // Blocks the sign in
        }
        return true;
    },

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
    signIn: '/auth', 
    error: '/auth', // Redirect back to auth on error
  },
  
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };