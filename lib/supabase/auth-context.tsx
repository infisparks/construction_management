'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { UserRole } from './types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch role from public.user_roles
  const fetchUserRole = async (userId: string, userEmail?: string | null) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setUserRole(data as UserRole);
      } else {
        // Fallback default role
        setUserRole({
          id: 'role-temp',
          user_id: userId,
          role: 'admin',
          email: userEmail || user?.email || null,
          page: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    // Check if demo auth session is active
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('infibuild_demo_auth') === 'true') {
        const demoUser = {
          id: 'demo-admin-id',
          email: 'admin@gmail.com',
          app_metadata: {},
          user_metadata: { name: 'Site Administrator' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any;
        const demoSession = {
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer',
          user: demoUser,
        } as any;
        setUser(demoUser);
        setSession(demoSession);
        setUserRole({
          id: 'role-demo',
          user_id: 'demo-admin-id',
          role: 'admin',
          email: 'admin@gmail.com',
          page: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // Helper to verify session expiration & auto-refresh
    const verifyAndApplySession = async (currentSession: Session | null) => {
      if (!currentSession) {
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Check if access token is expired (or about to expire within 10 seconds)
      const isExpired = currentSession.expires_at
        ? currentSession.expires_at * 1000 <= Date.now() + 10000
        : false;

      if (isExpired) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            // Cannot refresh -> session is truly expired
            console.warn('Session expired and cannot be refreshed, signing out.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setUserRole(null);
            setIsLoading(false);
            return;
          }
          currentSession = data.session;
        } catch {
          setUser(null);
          setSession(null);
          setUserRole(null);
          setIsLoading(false);
          return;
        }
      }

      setSession(currentSession);
      setUser(currentSession.user ?? null);
      if (currentSession.user) {
        await fetchUserRole(currentSession.user.id, currentSession.user.email);
      }
      setIsLoading(false);
    };

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsLoading(false);
      } else {
        verifyAndApplySession(session);
      }
    });

    // 2. Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        if (newSession.user) {
          await fetchUserRole(newSession.user.id, newSession.user.email);
        }
      } else {
        setUser(null);
        setSession(null);
        setUserRole(null);
      }
      setIsLoading(false);
    });

    // 3. Periodic session check & tab focus handler to catch expired sessions automatically
    const checkExpiry = async () => {
      try {
        if (typeof window !== 'undefined' && localStorage.getItem('infibuild_demo_auth') === 'true') {
          return;
        }
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error || !s) {
          setUser((prev) => {
            if (prev) {
              setSession(null);
              setUserRole(null);
              return null;
            }
            return prev;
          });
          return;
        }

        if (s.expires_at && s.expires_at * 1000 <= Date.now()) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.warn('Proactive check: token expired, signing out.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setUserRole(null);
          } else {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
          }
        }
      } catch (err) {
        console.error('Error during periodic session check:', err);
      }
    };

    const intervalId = setInterval(checkExpiry, 45000); // Check every 45s

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiry();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loginAsDemo = () => {
    try {
      localStorage.setItem('infibuild_demo_auth', 'true');
    } catch {
      // ignore
    }
    const demoUser = {
      id: 'demo-admin-id',
      email: 'admin@gmail.com',
      app_metadata: {},
      user_metadata: { name: 'Site Administrator' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any;
    const demoSession = {
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: 'bearer',
      user: demoUser,
    } as any;
    setUser(demoUser);
    setSession(demoSession);
    setUserRole({
      id: 'role-demo',
      user_id: 'demo-admin-id',
      role: 'admin',
      email: 'admin@gmail.com',
      page: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsLoading(false);
  };

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        setIsLoading(false);
        return { error: new Error(error.message) };
      }

      if (data?.session && data?.user) {
        setSession(data.session);
        setUser(data.user);
        await fetchUserRole(data.user.id, data.user.email);
      }
      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: new Error(err.message || 'Login failed') };
    }
  };

  const signUp = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (!error && data?.user) {
      // Automatically register user_roles if needed
      try {
        await supabase.from('user_roles').insert([
          {
            user_id: data.user.id,
            email: data.user.email,
            role: 'user',
          },
        ]);
      } catch {
        // Ignored
      }
    }
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('infibuild_demo_auth');
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isLoading,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
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
