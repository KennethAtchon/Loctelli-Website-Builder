'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthCookies } from '@/lib/cookies';
import type { AdminProfile, AdminLoginDto, AdminRegisterDto, AdminAuthResponse } from '@/lib/api';
import logger from '@/lib/logger';

interface AdminAuthContextType {
  admin: AdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  adminLogin: (credentials: AdminLoginDto) => Promise<void>;
  adminRegister: (data: AdminRegisterDto) => Promise<void>;
  adminLogout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckInProgress, setAuthCheckInProgress] = useState(false);

  const isAuthenticated = !!admin;

  // Check for existing admin tokens and auto-login on mount
  useEffect(() => {
    // Prevent multiple simultaneous auth checks during hot reloads
    if (authCheckInProgress) {
      logger.debug('🔄 Auth check already in progress, skipping...');
      return;
    }

    const checkAdminAuth = async () => {
      setAuthCheckInProgress(true);
      logger.debug('🔍 Checking admin authentication...');
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        logger.warn('⚠️ Admin auth check timeout - forcing loading to false');
        setIsLoading(false);
        setAuthCheckInProgress(false);
      }, 10000); // 10 second timeout

      try {
        // Check if we have any admin auth tokens
        if (AuthCookies.hasAdminTokens()) {
          logger.debug('✅ Found admin tokens, attempting to get profile...');
          
          // Get the actual tokens for debugging
          const adminAccessToken = AuthCookies.getAdminAccessToken();
          const adminRefreshToken = AuthCookies.getAdminRefreshToken();
          logger.debug('🔑 Admin access token exists:', !!adminAccessToken);
          logger.debug('🔑 Admin refresh token exists:', !!adminRefreshToken);
          logger.debug('🔑 Admin access token length:', adminAccessToken?.length || 0);
          
          // Try to get admin profile with detailed error handling
          try {
            const profile = await api.adminAuth.getAdminProfile();
            logger.debug('✅ Admin profile retrieved successfully:', profile.email);
            setAdmin(profile);
          } catch (profileError) {
            logger.error('❌ Admin profile request failed:', profileError);
            logger.error('❌ Error details:', {
              error: profileError,
              message: profileError instanceof Error ? profileError.message : 'Unknown error',
            });
            
            // Check if it's a network error vs auth error
            if (profileError instanceof Error) {
              if (profileError.message.includes('Failed to fetch') || 
                  profileError.message.includes('NetworkError') ||
                  profileError.message.includes('timeout')) {
                logger.debug('🌐 Network error detected, keeping tokens for retry');
                // Don't clear tokens for network errors
              } else if (profileError.message.includes('401') || 
                        profileError.message.includes('Unauthorized') || 
                        profileError.message.includes('Authentication failed')) {
                logger.debug('🔒 Auth error detected, clearing admin tokens');
                AuthCookies.clearAdminTokens();
              } else {
                logger.debug('❓ Unknown error type, keeping tokens');
              }
            }
            throw profileError; // Re-throw to be caught by outer catch
          }
        } else {
          logger.debug('❌ No admin tokens found');
        }
      } catch (error) {
        logger.error('❌ Admin auto-login failed:', error);
        
        // Only clear admin tokens if the error is specifically auth-related
        if (error instanceof Error) {
          if (error.message.includes('401') || 
              error.message.includes('Unauthorized') || 
              error.message.includes('Authentication failed')) {
            logger.debug('🔒 Auth error detected, clearing admin tokens only');
            AuthCookies.clearAdminTokens();
          } else {
            logger.debug('🌐 Network/other error, keeping tokens for retry');
          }
        }
      } finally {
        clearTimeout(timeoutId);
        logger.debug('🏁 Admin auth check completed');
        setIsLoading(false);
        setAuthCheckInProgress(false);
      }
    };

    checkAdminAuth();
  }, []);

  const adminLogin = async (credentials: AdminLoginDto) => {
    try {
      const response: AdminAuthResponse = await api.adminAuth.adminLogin(credentials);
      
      // Store admin tokens in cookies
      AuthCookies.setAdminAccessToken(response.access_token);
      AuthCookies.setAdminRefreshToken(response.refresh_token);
      
      // Set admin from login response (no need for additional API call)
      setAdmin(response.admin);
    } catch (error) {
      logger.error('Admin login failed:', error);
      // Re-throw the error so the form can handle it
      throw error;
    }
  };

  const adminRegister = async (data: AdminRegisterDto) => {
    try {
      // First register the admin
      await api.adminAuth.adminRegister(data);
      
      // Then automatically log them in with the same credentials
      const loginCredentials: AdminLoginDto = {
        email: data.email,
        password: data.password,
      };
      
      // Use the existing adminLogin method to handle the login
      await adminLogin(loginCredentials);
    } catch (error) {
      logger.error('Admin registration failed:', error);
      // Re-throw the error so the form can handle it
      throw error;
    }
  };

  const adminLogout = async () => {
    try {
      await api.adminAuth.adminLogout();
    } catch (error) {
      // Continue with logout even if API call fails
      logger.error('Admin logout API call failed:', error);
    }
    
    // Clear tokens and admin state
    AuthCookies.clearAdminTokens();
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    try {
      const profile = await api.adminAuth.getAdminProfile();
      setAdmin(profile);
    } catch (error) {
      // If getting profile fails, admin might be logged out
      setAdmin(null);
      AuthCookies.clearAdminTokens();
    }
  };

  const value: AdminAuthContextType = {
    admin,
    isLoading,
    isAuthenticated,
    adminLogin,
    adminRegister,
    adminLogout,
    refreshAdmin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
} 