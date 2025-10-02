import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface UserTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  provisioning_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  tenant: UserTenant | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: string | null;
  adminLoaded: boolean;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<UserTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminLoaded, setAdminLoaded] = useState(false); // indicates evaluateAdminStatus finished at least once
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes role cache
  const HEARTBEAT_MS = 5 * 60 * 1000; // revalidate every 5 minutes
  const lastIsAdminRef = (typeof window !== 'undefined') ? (window as any).__lastIsAdminRef || { current: false } : { current: false };
  if (typeof window !== 'undefined') { (window as any).__lastIsAdminRef = lastIsAdminRef; }

  // Helper: determine if email belongs to internal staff domain
  const isInternalEmail = (email?: string | null) => {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = (import.meta.env.VITE_ADMIN_ALLOWED_DOMAINS || 'blunari.ai').split(',').map(d => d.trim().toLowerCase());
    return allowedDomains.includes(domain);
  };

  const evaluateAdminStatus = useCallback(async (userId: string, email?: string | null) => {
    try {
      // Query employees table for active role
      const { data: employee, error: empErr } = await supabase
        .from('employees')
        .select('role,status')
        .eq('user_id', userId)
        .maybeSingle();

      // Fallback: admin_users table (if exists)
      let adminUser: any = null;
      if (!employee) {
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('role,is_active')
          .eq('user_id', userId)
          .maybeSingle();
        adminUser = adminRow;
      }

      const profileBasedRole = (profile as any)?.role; // legacy support
      const role = employee?.role || adminUser?.role || profileBasedRole || null;
      const active = (employee?.status === 'ACTIVE') || (adminUser?.is_active === true);
      const staffDomainsOk = isInternalEmail(email || user?.email || null);

      const adminAllowed = !!role && ['SUPER_ADMIN','ADMIN','SUPPORT','OPS'].includes(role) && active;
      const finalIsAdmin = adminAllowed || staffDomainsOk;

      setAdminRole(role);
      setIsAdmin(finalIsAdmin);
      setAdminLoaded(true);

      // Persist cache locally for faster subsequent loads
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            `ADMIN_ROLE_CACHE_${userId}`,
            JSON.stringify({ role, isAdmin: finalIsAdmin, ts: Date.now() })
          );
        }
      } catch {}

      // Detect revocation: previously true, now false
      if (lastIsAdminRef.current && !finalIsAdmin) {
        try {
          await supabase.rpc('log_security_event', {
            p_event_type: 'admin_role_revoked',
            p_severity: 'warning',
            p_event_data: { user_id: userId, prev_role: adminRole, now_role: role, timestamp: new Date().toISOString() }
          });
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.warn('Failed to log revoke event', e);
        }
      }
      lastIsAdminRef.current = finalIsAdmin;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('evaluateAdminStatus failed', e);
      }
      setIsAdmin(false);
      setAdminRole(null);
      setAdminLoaded(true);
      if (lastIsAdminRef.current) {
        // Log downgrade to no admin (e.g., network fail) at lower severity once per failure window
        try {
          await supabase.rpc('log_security_event', {
            p_event_type: 'admin_role_check_failed',
            p_severity: 'info',
            p_event_data: { user_id: user?.id, error: (e as any)?.message || String(e) }
          });
        } catch {}
      }
      lastIsAdminRef.current = false;
    }
  }, [profile, user]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching profile:", profileError);
        }
        return;
      }

      setProfile(profileData);

      // Fetch tenant information
      const { data: tenantData, error: tenantError } = await supabase.rpc(
        "get_user_tenant",
        { p_user_id: userId },
      );

      if (tenantError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching tenant:", tenantError);
        }
        return;
      }

      if (tenantData && tenantData.length > 0) {
        setTenant(tenantData[0]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error in fetchProfile:", error);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Warm from cache immediately (optimistic) before remote evaluation
        try {
          const cacheRaw = typeof window !== 'undefined' ? window.localStorage.getItem(`ADMIN_ROLE_CACHE_${session.user.id}`) : null;
          if (cacheRaw) {
            const cache = JSON.parse(cacheRaw);
            if (cache.ts && (Date.now() - cache.ts) < CACHE_TTL_MS) {
              setIsAdmin(!!cache.isAdmin);
              setAdminRole(cache.role || null);
              // We still mark adminLoaded=false until evaluate finishes for fresh correctness
            }
          }
        } catch {}
        // Defer profile fetching to avoid auth state deadlock
        setTimeout(() => {
          if (isMounted) {
            fetchProfile(session.user.id);
            evaluateAdminStatus(session.user.id, session.user.email);
          }
        }, 0);
      } else {
        setProfile(null);
        setTenant(null);
        setIsAdmin(false);
        setAdminRole(null);
        setAdminLoaded(true);
      }

      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Attempt cached role fast-path
        try {
          const cacheRaw = typeof window !== 'undefined' ? window.localStorage.getItem(`ADMIN_ROLE_CACHE_${session.user.id}`) : null;
          if (cacheRaw) {
            const cache = JSON.parse(cacheRaw);
            if (cache.ts && (Date.now() - cache.ts) < CACHE_TTL_MS) {
              setIsAdmin(!!cache.isAdmin);
              setAdminRole(cache.role || null);
            }
          }
        } catch {}
        setTimeout(() => {
          if (isMounted) {
            fetchProfile(session.user.id);
            evaluateAdminStatus(session.user.id, session.user.email);
          }
        }, 0);
      } else {
        setAdminLoaded(true);
      }

  // Heartbeat revalidation of admin role
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      evaluateAdminStatus(user.id, user.email);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [user, evaluateAdminStatus]);

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
    ) => {
      try {
        const allowSelfSignup = (import.meta.env.VITE_ENABLE_ADMIN_SELF_SIGNUP || 'false').toLowerCase() === 'true';
        if (!allowSelfSignup) {
          return { error: { message: 'Public admin sign-up disabled. Use an internal invite.' } } as any;
        }
        if (!isInternalEmail(email)) {
          return { error: { message: 'Only internal staff emails may register here.' } } as any;
        }
        // Enhanced validation with security checks
        if (!email || !password || !firstName || !lastName) {
          return { error: { message: "All fields are required" } };
        }

        if (password.length < 12) {
          return {
            error: {
              message:
                "Password must be at least 12 characters long for security",
            },
          };
        }

        // Enhanced password strength check
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
          return {
            error: {
              message:
                "Password must contain uppercase, lowercase, numbers, and special characters",
            },
          };
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { error: { message: "Please enter a valid email address" } };
        }

        // Sanitize input
        const sanitizedEmail = email.toLowerCase().trim();
        const sanitizedFirstName = firstName.trim().replace(/[<>]/g, "");
        const sanitizedLastName = lastName.trim().replace(/[<>]/g, "");

        const redirectUrl = `${window.location.origin}/admin/dashboard`;

        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: sanitizedFirstName,
              last_name: sanitizedLastName,
            },
          },
        });

        // Log registration attempt
        if (!error) {
          try {
            await supabase.rpc("log_security_event", {
              p_event_type: "user_registration",
              p_severity: "info",
              p_event_data: {
                email: sanitizedEmail,
                timestamp: new Date().toISOString(),
              },
            });
          } catch (logError) {
            console.warn("Failed to log registration event:", logError);
          }
        }

        return { error };
      } catch (error) {
        return { error };
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Enhanced validation
      if (!email || !password) {
        return { error: { message: "Email and password are required" } };
      }

      const sanitizedEmail = email.toLowerCase().trim();

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (!error) {
        // After successful login evaluate admin status quickly
        if (session?.user) {
          evaluateAdminStatus(session.user.id, sanitizedEmail);
        } else {
          // fetch session again
          const { data: s } = await supabase.auth.getSession();
          const u = s?.session?.user;
          if (u) evaluateAdminStatus(u.id, u.email);
        }
      }

      // Log authentication attempt
      try {
        await supabase.rpc("log_security_event", {
          p_event_type: error ? "login_failed" : "login_success",
          p_severity: error ? "medium" : "info",
          p_event_data: {
            email: sanitizedEmail,
            timestamp: new Date().toISOString(),
            error_type: error?.message || null,
          },
        });
      } catch (logError) {
        console.warn("Failed to log authentication event:", logError);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setTenant(null);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error signing out:", error);
      }
    }
  }, []);

  const value = {
    user,
    session,
    profile,
    tenant,
    loading,
    isAdmin,
    adminRole,
    adminLoaded,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
