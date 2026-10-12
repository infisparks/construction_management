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
  const fetchUserRole = async (userId: string) => {
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
          email: user?.email || null,
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
        setUser(demoUser);
        setUserRole({
          id: 'role-demo',
          user_id: 'demo-admin-id',
          role: 'onlyallow',
          email: 'admin@gmail.com',
          page: 'files-archive, materials',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setIsLoading(false);
    });

    // 2. Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
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
    setUser(demoUser);
    setUserRole({
      id: 'role-demo',
      user_id: 'demo-admin-id',
      role: 'onlyallow',
      email: 'admin@gmail.com',
      page: 'files-archive, materials',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsLoading(false);
  };

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    return { error: error ? new Error(error.message) : null };
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
    await supabase.auth.signOut();
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
