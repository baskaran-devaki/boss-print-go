import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, ListOrdered, LogOut, Printer, Menu, IndianRupee, Clock, Lock } from "lucide-react";
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
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"dash" | "orders">("dash");
  const [open, setOpen] = useState(false);

  if (!authed)
    return (
      <div className="hero-pg grid min-h-screen place-items-center px-4">
        <form onSubmit={(e) => { e.preventDefault(); setAuthed(true); }} className="card-pg w-full max-w-sm animate-rise space-y-4">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><Lock className="h-5 w-5" /></span>
            <LangToggle />
          </div>
          <h1 className="font-display text-2xl font-bold">{t.login}</h1>
          <input required type="email" placeholder={t.email} className="input-pg" />
          <input required type="password" placeholder={t.password} className="input-pg" />
          <button className="btn-primary-pg w-full">{t.signIn}</button>
          <Link to="/" className="block text-center text-xs text-muted-foreground underline">BOSS PrintGo</Link>
        </form>
      </div>
    );

  const nav = [{ k: "dash" as const, l: t.dashboard, i: LayoutDashboard }, { k: "orders" as const, l: t.orders, i: ListOrdered }];
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
          <button onClick={() => setAuthed(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-80"><LogOut className="h-4 w-4" />{t.logout}</button>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display font-semibold">{tab === "dash" ? t.dashboard : t.orders}</h1>
          <LangToggle />
        </header>
        <main className="space-y-4 p-4">
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
        </main>
      </div>
    </div>
  );
}
