import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  authApi,
  User,
  AuthResponse,
  getAccessToken,
  setTokens,
  clearTokens,
  getRefreshToken,
  ApiError,
} from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, role?: 'internal' | 'customer') => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Complete login after OAuth redirect: store tokens and fetch user. Used by /auth/callback. Returns user for redirect logic. */
  completeOAuthRedirect: (accessToken: string, refreshToken: string) => Promise<User>;
  logout: () => void;
  completeOnboarding: (name: string, companyName?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setUser(user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await authApi.refreshToken(refreshToken);
            handleAuthResponse(response);
            return;
          } catch {
            // Refresh failed, logout
          }
        }
        logout();
      }
      throw error;
    }
  }, [handleAuthResponse, logout]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          await refreshUser();
        } catch {
          // Token invalid, already logged out
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    handleAuthResponse(response);
  };

  const register = async (email: string, password: string, name?: string, role: 'internal' | 'customer' = 'internal') => {
    const response = await authApi.register(email, password, name, role);
    handleAuthResponse(response);
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authApi.googleAuth(idToken);
    handleAuthResponse(response);
  };

  const completeOAuthRedirect = useCallback(async (accessToken: string, refreshToken: string): Promise<User> => {
    setTokens(accessToken, refreshToken);
    const user = await authApi.getCurrentUser();
    setUser(user);
    return user;
  }, []);

  const completeOnboarding = async (name: string, companyName?: string) => {
    const updatedUser = await authApi.completeOnboarding(name, companyName);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        completeOAuthRedirect,
        logout,
        completeOnboarding,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
