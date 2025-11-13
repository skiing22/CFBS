import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiClient } from '../lib/api';
import { transformUserToClient } from '../lib/transformers';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    phone?: string;
    designation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.data) {
            setCurrentUser(transformUserToClient(response.data));
          } else {
            apiClient.clearAuthToken();
          }
        } catch (error) {
          apiClient.clearAuthToken();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        const user = transformUserToClient(response.data.user);
        setCurrentUser(user);
        apiClient.setAuthToken(response.data.token);
        return { success: true };
      }
      return { success: false, error: response.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    phone?: string;
    designation?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.register(userData);
      if (response.success && response.data) {
        const user = transformUserToClient(response.data.user);
        setCurrentUser(user);
        apiClient.setAuthToken(response.data.token);
        return { success: true };
      }
      return { success: false, error: response.message || 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    apiClient.clearAuthToken();
     window.location.href = "/login";
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};