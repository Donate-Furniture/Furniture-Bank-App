// File: app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple"; 
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  // 1. Adapter: Connects NextAuth to your Prisma/PostgreSQL DB
  adapter: PrismaAdapter(prisma),
  
  // 2. Providers: The services you want to allow
  providers: [
    // Social Providers (Requires Client ID/Secret in .env.local)
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
    
    // 3. Credentials Provider (Your Custom Email/Password Logic)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // A. Check inputs
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // B. Find User
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });

        // C. Check if user exists and has a password
        if (!user || !user.password) {
          throw new Error("Invalid credentials or user registered with social media");
        }

        // D. Verify Password
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // E. Return User (Success)
        // We map your DB fields to the standard NextAuth user object
        return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`, // Combine for NextAuth default
            // Custom fields can be passed through via callbacks below
            firstName: user.firstName, 
            lastName: user.lastName,
        };
      }
    })
  ],

  session: {
    strategy: "jwt",
  },

  // 4. Callbacks: Customize the token and session to include your extra fields
  callbacks: {
    async jwt({ token, user }) {
      // 'user' is only present on the very first sign-in
      if (user) {
        token.id = user.id;
        // @ts-ignore: NextAuth types don't know about these custom fields yet
        token.firstName = user.firstName;
        // @ts-ignore
        token.lastName = user.lastName;

      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Pass data from the token to the client-side session
        // @ts-ignore
        session.user.id = token.id;
        // @ts-ignore
        session.user.firstName = token.firstName;
        // @ts-ignore
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
  
  // 5. Custom Pages
  pages: {
    signIn: '/auth', // Redirects here if authentication fails
  },
  
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };