import { PolicyLinks } from "./public-info";
import { ShopStatusBadge } from "@/components/shop-status";
import { Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { Printer, LayoutDashboard, PackageCheck, History, ArrowRight, LogOut } from "lucide-react";
import { getCustomer, enterCustomer, leaveCustomer } from "@/lib/customers.functions";
import { CUSTOMER_CATEGORIES, type CustomerEntry } from "@/lib/customers";
import { useLang, LangToggle } from "@/lib/i18n";
import { Button } from "./ui/button";

export const customerOptions = queryOptions({ queryKey: ["customer-session"], queryFn: () => getCustomer(), staleTime: 0 });
export function useCustomer() { return useSuspenseQuery(customerOptions).data; }
export function CustomerShell({ children, page }: { children: ReactNode; page: "dashboard" | "status" | "history" }) {
  const customer = useCustomer();
  const { t } = useLang();
  const client = useQueryClient();
  const navigate = useNavigate();
  const enter = useServerFn(enterCustomer);
  const leave = useServerFn(leaveCustomer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<CustomerEntry["category"] | "">("");
  useEffect(() => {
    if (!customer) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      const remaining = new Date(customer.sessionExpiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        client.setQueryData(customerOptions.queryKey, null);
        client.removeQueries({ queryKey: ["customer-orders"] });
        return;
      }
      timer = setTimeout(checkExpiry, Math.min(remaining, 60_000));
    };
    const checkOnFocus = () => {
      clearTimeout(timer);
      checkExpiry();
      void client.invalidateQueries({ queryKey: customerOptions.queryKey });
    };
    checkExpiry();
    window.addEventListener("focus", checkOnFocus);
    return () => { clearTimeout(timer); window.removeEventListener("focus", checkOnFocus); };
  }, [customer, client]);
  async function signIn(form: HTMLFormElement) {
    setBusy(true); setError("");
    const values = new FormData(form);
    try {
      if (!category) return;
      const saved = await enter({ data: { name: String(values.get("name")), mobile: String(values.get("mobile")), category } });
      client.setQueryData(customerOptions.queryKey, saved);
      await client.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (e) { setError(e instanceof Error ? e.message : t.customerEntryError); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await leave(); client.setQueryData(customerOptions.queryKey, null); client.removeQueries({ queryKey: ["customer-orders"] }); await navigate({ to: "/" }); }
    catch (e) { setError(e instanceof Error ? e.message : t.customerEntryError); }
    finally { setBusy(false); }
  }
  const categories = { school_student: t.schoolStudent, college_student: t.collegeStudent, others: t.others };
  if (!customer) return <div className="customer-entry min-h-screen bg-background">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link to="/" aria-label="BOSS PrintGo home" className="inline-flex h-11 w-11 items-center justify-center text-primary"><Printer className="h-7 w-7" aria-hidden="true" /></Link><LangToggle /></header>
    <main className="mx-auto max-w-md px-5 pb-10 pt-10 sm:pt-16">
      <div className="animate-rise mb-10 text-center">
        <img src="/boss-printgo-logo.png" alt="BOSS PrintGo" width="160" height="160" fetchPriority="high" className="boss-login-logo" />
        <p className="mt-3 font-display text-lg font-semibold leading-snug text-accent-foreground sm:text-xl">{t.loginTagline}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.loginDescription}</p>
      </div>
      <h2 className="mb-6 font-display text-xl font-semibold">{t.customerLogin}</h2>
      <form onSubmit={(e) => { e.preventDefault(); void signIn(e.currentTarget); }} className="space-y-5">
        <label className="block space-y-2 text-sm font-medium"><span>{t.name} *</span><input name="name" required autoComplete="name" maxLength={100} className="input-pg" /></label>
        <label className="block space-y-2 text-sm font-medium"><span>{t.mobileOptional}</span><input name="mobile" type="tel" autoComplete="tel" inputMode="numeric" pattern="[0-9]{10}|^$" maxLength={10} className="input-pg" /></label>
        <label className="block space-y-2 text-sm font-medium"><span>{t.category} *</span><select required aria-label={t.category} value={category} onChange={(e) => setCategory(e.target.value as CustomerEntry["category"])} className="input-pg"><option value="" disabled>{t.selectCategory}</option>{CUSTOMER_CATEGORIES.map((key) => <option key={key} value={key}>{categories[key]}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="btn-primary-pg h-12 w-full">{busy ? "…" : t.continue}<ArrowRight className="h-4 w-4" /></Button>
      </form>
      <div className="boss-login-links flex items-center justify-center gap-3 text-center text-xs text-muted-foreground"><Link to="/admin" className="underline">{t.admin}</Link><PolicyLinks /></div>
    </main>
  </div>;
  const tabs = [{ key: "dashboard", to: "/" as const, label: t.dashboard, icon: LayoutDashboard }, { key: "status", to: "/status" as const, label: t.statusTab, icon: PackageCheck }, { key: "history", to: "/history" as const, label: t.history, icon: History }];
  return <div className="customer-app min-h-screen bg-background pb-28">
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-0.5">
        <Link to="/" aria-label="BOSS PrintGo home" className="block w-12 max-w-full justify-self-start">
          <img src="/boss-printgo-logo.png" alt="BOSS PrintGo" width="48" height="48" className="h-auto w-full object-contain" />
        </Link>
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-lg bg-accent text-primary"><Printer className="h-4 w-4" /></span>
          <ShopStatusBadge compact />
        </div>
        <div className="flex min-w-0 flex-col items-end gap-0 justify-self-end">
          <Button variant="ghost" size="icon" className="h-6 w-8" disabled={busy} title={t.logout} aria-label={t.logout} onClick={() => void logout()}><LogOut className="h-4 w-4" /></Button>
          <div className="[&_button]:h-5 [&_button]:min-h-0 [&_button]:px-2 [&_button]:py-0 [&_button]:text-[10px] [&_button]:leading-4"><LangToggle /></div>
        </div>
      </div>
      <div className="boss-tagline-marquee mx-auto max-w-5xl text-[10px] leading-3 font-semibold tracking-wide text-primary/90"><p className="boss-tagline-track">{t.headerTagline}</p></div>
    </header>
    <div className="mx-auto max-w-5xl px-4 pb-5 pt-6"><p className="text-xs text-muted-foreground">{t.welcome}</p><h1 className="mt-1 break-words font-display text-2xl font-bold">{customer.name}</h1><p className="mt-1 text-sm text-primary">{categories[customer.category]}</p>{error && <p role="alert" className="text-destructive">{error}</p>}</div>
    {children}
    <nav aria-label="Customer navigation" className="customer-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card"><div className="mx-auto grid max-w-xl grid-cols-3">{tabs.map(({ key, to, label, icon: Icon }) => <Link key={key} to={to} aria-current={page === key ? "page" : undefined} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 text-center text-xs font-semibold ${page === key ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" /><span className="break-words">{label}</span></Link>)}</div></nav>
  </div>;
}