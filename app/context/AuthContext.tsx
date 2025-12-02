import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

//This file creates a single source of truth for the user's login status (isLoggedIn, user, token). Any React component 
// (like a header or a protected form) can now simply call const { user, logout } = useAuth(); to access the state.


// --- 1. Define Types ---

// The structure of the user object we store on the frontend
interface User {
  id: string;
  email: string;
  firstName: string; // Updated
  lastName: string;  // Updated
  location: string | null;
}

// The shape of the context values provided to components
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
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
    // This runs once when the app loads to check if the user is already logged in
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (storedToken) {
        // NOTE: In a full app, you would verify this token with an API call (e.g., GET /api/auth/me).
        // For simplicity in this MVP, we rely on the token being present.
        setToken(storedToken);
        
        // **IMPORTANT:** Since the user data (name, email) isn't in the JWT, 
        // we'd need to fetch it here using the token, but we defer that fetch 
        // to keep the boilerplate simple. Assume token presence means logged in.
    }
    setIsLoading(false);
  }, []);

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
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