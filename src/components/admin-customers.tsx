import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, RefreshCw } from "lucide-react";
import { getAdminCustomers } from "@/lib/customers.functions";
import { useLang } from "@/lib/i18n";
import { Button } from "./ui/button";
export function AdminCustomers() {
  const { t } = useLang();
  const fetch = useServerFn(getAdminCustomers);
  const query = useQuery({ queryKey: ["admin-customers"], queryFn: () => fetch(), refetchInterval: 15_000 });
  const categories: Record<string, string> = { school_student: t.schoolStudent, college_student: t.collegeStudent, others: t.others };
  return <div className="space-y-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t.customerCount}</p><p className="flex items-center gap-3 font-display text-3xl font-bold"><Users className="text-primary" />{query.data?.count ?? "—"}</p></div><Button variant="outline" size="icon" aria-label={t.refresh} onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>
    {query.isPending && <p role="status">{t.loadingCustomers}</p>}{query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{[t.name, t.mobileOptional, t.category, t.visits, t.lastVisit].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{query.data?.customers.map((c) => <tr key={c.id} className="border-b border-border"><td className="max-w-48 break-words px-3 py-4 font-medium">{c.name}</td><td className="px-3 py-4">{c.mobile || "—"}</td><td className="px-3 py-4">{categories[c.category]}</td><td className="px-3 py-4">{c.login_count}</td><td className="whitespace-nowrap px-3 py-4">{new Date(c.last_login_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>)}</tbody></table></div>{query.data?.count === 0 && <p className="text-muted-foreground">{t.noCustomers}</p>}
  </div>;
}