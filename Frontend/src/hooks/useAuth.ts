import { useState, useEffect } from "react";
import type { AuthUser as User, AuthSession as Session } from "@/integrations/platform/client";
import { platformClient as platform } from "@/integrations/platform/client";

export const DEV_MODE_KEY = "huminex_dev_mode";
export const DEV_MODE_TYPE_KEY = "huminex_dev_mode_type";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode] = useState(false);

  useEffect(() => {
    // Dev-mode bypass is disabled for employee/employer portal auth.
    localStorage.removeItem(DEV_MODE_KEY);
    localStorage.removeItem(DEV_MODE_TYPE_KEY);

    // Set up auth state listener FIRST
    const { data: { subscription } } = platform.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    platform.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem(DEV_MODE_KEY);
    localStorage.removeItem(DEV_MODE_TYPE_KEY);
    setUser(null);
    setSession(null);
    await platform.auth.signOut();
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const redirectUrl = `${window.location.origin}/portal`;
    const { data, error } = await platform.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await platform.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const enableDevMode = (_type: "admin" | "client") => {
    console.warn("Dev mode login bypass is disabled.");
  };

  return { user, session, loading, signOut, signUp, signIn, isDevMode, enableDevMode };
};
