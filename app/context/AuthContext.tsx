import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/lib/types';
//The purpose of the AuthContext.tsx file is to serve as a single source of truth for your user's authentication 
// status across the entire frontend application.


// --- 1. Define Types ---


// The shape of the context values provided to components
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  // FIX: Added isAuthenticated to the interface
  isAuthenticated: boolean; 
}

// --- 2. Create Context and Initial State ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a placeholder key for secure token storage
const TOKEN_STORAGE_KEY = 'user-auth-token';

// --- 3. The Provider Component ---

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Utility Functions ---

  const saveToken = useCallback((newToken: string) => {
    try {
      // NOTE: For better security, a token should ideally be stored in HttpOnly cookies.
      // For this MVP, we use localStorage for simplicity, but acknowledge the security trade-off.
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setToken(newToken);
    } catch (error) {
      console.error("Could not save token to storage:", error);
    }
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // --- Core Methods ---

  const login = useCallback((newToken: string, newUser: User) => {
    saveToken(newToken);
    setUser(newUser);
  }, [saveToken]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // --- Initial Load Effect (Checks for Token on Startup) ---
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (storedToken) {
        setToken(storedToken);
    }
    setIsLoading(false);
  }, []);
  
  // Computed property: isAuthenticated
  const isAuthenticated = !!user && !!token;

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated, // Added to the context value
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 4. The Custom Hook ---

/**
 * Custom hook to consume the authentication context in any component.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};