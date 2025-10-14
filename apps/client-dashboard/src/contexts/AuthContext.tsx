import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;
    
    // Development mode bypass
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_BYPASS_AUTH === 'true') {
      if (import.meta.env.DEV)      if (isMounted) {
        setLoading(false);
      }
      return;
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        authInitialized = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (import.meta.env.VITE_ENABLE_DEV_MODE === 'true') {
          if (import.meta.env.DEV)        }
      }
    });

    // Check for existing session
    const sessionCheck = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session check error:", error);
        }
        if (isMounted && !authInitialized) {
          authInitialized = true;
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          if (import.meta.env.VITE_ENABLE_DEV_MODE === 'true') {
            if (import.meta.env.DEV)          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        if (isMounted && !authInitialized) {
          authInitialized = true;
          setLoading(false);
        }
      }
    };

    sessionCheck();

    // Reduced timeout to prevent long waits, but still provide a safety net
    const timeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        if (import.meta.env.VITE_ENABLE_DEV_MODE === 'true') {
          console.warn("Auth initialization timeout (3s), proceeding without auth");
        }
        authInitialized = true;
        setLoading(false);
      }
    }, 3000); // Increased to 3 seconds for better stability // Reduced from 3000ms to 1500ms

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata = {}) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=reset`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


