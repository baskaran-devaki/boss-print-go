import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setUser(session?.user ?? null);
      setLoading(false);
      void router.invalidate();
      if (event !== "SIGNED_OUT") void client.invalidateQueries();
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client, router]);
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}