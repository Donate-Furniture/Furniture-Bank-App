// NextAuth Provider Component: Wraps the application to expose the authentication session context globally.
// Required for `useSession` hooks to work in client components throughout the app.

"use client";

import { SessionProvider } from "next-auth/react";

interface Props {
  children: React.ReactNode;
}

export const NextAuthProvider = ({ children }: Props) => {
  // Wraps the entire app (or specific subtrees) with the Session Context
  return <SessionProvider>{children}</SessionProvider>;
};
