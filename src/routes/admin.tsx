import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AdminPricing } from "@/components/admin-pricing";
import { Button } from "@/components/ui/button";
import { checkAdmin } from "@/lib/pricing.functions";
import { LayoutDashboard, ListOrdered, LogOut, Printer, Menu, IndianRupee, Clock, Lock, Settings } from "lucide-react";
import { useLang, LangToggle } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BOSS PrintGo" },
      { name: "description", content: "Manage print orders for BOSS PrintGo." },
      { property: "og:title", content: "Admin — BOSS PrintGo" },
      { property: "og:description", content: "Manage print orders for BOSS PrintGo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const orders = [
  { id: "BPG-2041", name: "Priya S", pages: 24, amt: 24, status: "Printing" },
  { id: "BPG-2040", name: "Karthik R", pages: 8, amt: 40, status: "Ready" },
  { id: "BPG-2039", name: "Divya M", pages: 50, amt: 40, status: "Received" },
  { id: "BPG-2038", name: "Arun K", pages: 12, amt: 12, status: "Picked up" },
];

function Admin() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const verifyAdmin = useServerFn(checkAdmin);
  const admin = useQuery({ queryKey: ["admin-access", user?.id], queryFn: () => verifyAdmin(), enabled: !!user });
  const [tab, setTab] = useState<"dash" | "orders" | "pricing">("dash");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [open, setOpen] = useState(false);

  async function logout() {
    await client.cancelQueries(); client.clear();
    await supabase.auth.signOut();
  }
  async function signIn(form: HTMLFormElement) {
    const data = new FormData(form);
    setSigningIn(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(data.get("email")).trim(), password: String(data.get("password")) });
    if (error) setLoginError(error.message);
    setSigningIn(false);
  }
  if (loading || (user && admin.isPending)) return <div className="grid min-h-screen place-items-center bg-background"><p role="status">{t.loadingPricing}</p></div>;
  if (user && !admin.data) return <div className="grid min-h-screen place-items-center bg-background px-4"><div className="space-y-4 text-center"><p role="alert">{admin.error?.message || t.adminRequired}</p><Button onClick={() => void logout()}><LogOut />{t.logout}</Button><Link to="/" className="block text-primary">BOSS PrintGo</Link></div></div>;

  if (!user)
    return (
      <div className="hero-pg grid min-h-screen place-items-center px-4">
        <form onSubmit={(e) => { e.preventDefault(); void signIn(e.currentTarget); }} className="card-pg w-full max-w-sm animate-rise space-y-4">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><Lock className="h-5 w-5" /></span>
            <LangToggle />
          </div>
          <h1 className="font-display text-2xl font-bold">{t.login}</h1>
          <input required name="email" autoComplete="username" type="email" placeholder={t.email} aria-label={t.email} className="input-pg" />
          <input required name="password" autoComplete="current-password" type="password" placeholder={t.password} aria-label={t.password} className="input-pg" />
          {loginError && <p role="alert" className="text-sm text-destructive">{loginError}</p>}
          <Button disabled={signingIn} className="btn-primary-pg w-full">{t.signIn}</Button>
          <Link to="/" className="block text-center text-xs text-muted-foreground underline">BOSS PrintGo</Link>
        </form>
      </div>
    );

  const nav = [{ k: "dash" as const, l: t.dashboard, i: LayoutDashboard }, { k: "orders" as const, l: t.orders, i: ListOrdered }, { k: "pricing" as const, l: t.pricingSettings, i: Settings }];
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-sidebar p-4 text-sidebar-foreground transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center gap-2 font-display text-lg font-bold"><Printer className="h-5 w-5" /> BOSS PrintGo</div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <button key={n.k} onClick={() => { setTab(n.k); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === n.k ? "bg-sidebar-accent text-sidebar-accent-foreground" : "opacity-80"}`}>
              <n.i className="h-4 w-4" />{n.l}
            </button>
          ))}
          <Button variant="ghost" onClick={() => void logout()} className="flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm opacity-80"><LogOut className="h-4 w-4" />{t.logout}</Button>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display font-semibold">{tab === "dash" ? t.dashboard : tab === "pricing" ? t.pricingSettings : t.orders}</h1>
          <LangToggle />
        </header>
        <main className="space-y-4 p-4">
          {tab === "pricing" ? <AdminPricing /> : <>
          {tab === "dash" && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[[t.orders, "128", ListOrdered], [t.revenue, "₹4,820", IndianRupee], [t.pending, "9", Clock]].map(([l, v, I]: any) => (
                <div key={l} className="card-pg animate-rise"><I className="mb-2 h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-3xl font-bold">{v}</p></div>
              ))}
            </div>
          )}
          <div className="card-pg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2">ID</th><th>{t.name}</th><th>{t.pages}</th><th>₹</th><th>Status</th></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id} className="border-t border-border"><td className="py-3 font-medium">{o.id}</td><td>{o.name}</td><td>{o.pages}</td><td>{o.amt}</td><td><span className="rounded-full bg-accent px-2 py-1 text-xs text-primary">{o.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          </>}
        </main>
      </div>
    </div>
  );
}
