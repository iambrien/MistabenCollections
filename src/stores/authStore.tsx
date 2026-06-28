import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = "mistaben@gmail.com";

  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) { setUser(session?.user ?? null); setLoading(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) { setUser(session.user); setLoading(false); }
      else if (event === "SIGNED_OUT") { setUser(null); setLoading(false); }
      else if (event === "TOKEN_REFRESHED" && session?.user) { setUser(session.user); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
      throw new Error("Access denied. Unauthorized email address.");
    }
    // Try sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) return;

    // If user doesn't exist yet or email not confirmed, auto-create/re-create the admin account
    const msg = signInError.message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("user not found") || msg.includes("email not confirmed")) {
      // Sign up with email_confirm disabled via options
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "admin" }, emailRedirectTo: undefined },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
        throw new Error(signUpError.message);
      }
      // If sign up returned a session directly (email confirm disabled), we're done
      if (signUpData?.session) return;
      // Otherwise try signing in again — the account exists, confirm it server-side
      const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
      if (!retryError) return;
      // Last resort: account exists but email unconfirmed — surface clear message
      if (retryError.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Account created — please disable email confirmation in OnSpace Cloud > Auth Settings, then try again.");
      }
      throw new Error(retryError.message);
    }
    throw new Error(signInError.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
