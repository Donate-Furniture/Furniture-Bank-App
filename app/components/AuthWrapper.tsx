'use client'; 

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/app/context/AuthContext';

/**
 * This component acts as a Client Component boundary for the AuthProvider.
 * It ensures the use of React hooks (like useState and useEffect inside AuthProvider)
 * is compatible with the Server Component structure of the root layout.
 */
interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>;
}