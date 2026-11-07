import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBinding, getAdminBinding, saveBinding } from "@/lib/pricing.functions";
import { bindingRangeSchema, coilSizeForPages, type BindingRange } from "@/lib/pricing";
import { useLang } from "@/lib/i18n";

export function AdminBinding() {
  const { t } = useLang();
  const client = useQueryClient();
  const fetchRows = useServerFn(getAdminBinding);
  const save = useServerFn(saveBinding);
  const remove = useServerFn(deleteBinding);
  const query = useQuery({ queryKey: ["admin-binding"], queryFn: () => fetchRows() });
  const [editing, setEditing] = useState<{ id?: string; range: BindingRange } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["admin-binding"] });
    await client.invalidateQueries({ queryKey: ["customer-pricing"] });
  }
  async function submit() {
    if (!editing) return;
    const parsed = bindingRangeSchema.safeParse(editing.range);
    if (!parsed.success) { setError(t.invalidRange); return; }
    setBusy(true); setError("");
    try { await save({ data: { id: editing.id, range: parsed.data } }); setEditing(null); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : t.priceError); }
    finally { setBusy(false); }
  }
  async function del(id: string) {
    setBusy(true); setError("");
    try { await remove({ data: { id } }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : t.priceError); }
    finally { setBusy(false); }
  }
  const rows = query.data ?? [];
  const last = rows[rows.length - 1];
  const set = (k: keyof BindingRange, v: number) => setEditing((c) => c ? { ...c, range: { ...c.range, [k]: v } } : null);

  return <section className="space-y-4 pt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{t.spiralSettings}</h2>
      <Button onClick={() => { const from = last ? last.max_pages + 1 : 1; setEditing({ range: { min_pages: from, max_pages: from + 24, price: last ? last.price + 10 : 50 } }); setError(""); }}><Plus />{t.addRange}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {editing && <form className="space-y-4 border-y border-border py-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid gap-4 sm:grid-cols-3">
        {([["min_pages", t.fromPaper, 1], ["max_pages", t.toPaper, 1], ["price", t.bindPrice, 0.01]] as const).map(([k, label, step]) =>
          <label key={k} className="space-y-1 text-sm"><span>{label}</span><input className="input-pg" type="number" required min={k === "price" ? 0 : 1} step={step} value={Number.isNaN(editing.range[k]) ? "" : editing.range[k]} onChange={(e) => set(k, e.target.valueAsNumber)} /></label>)}
      </div>
      <div className="flex gap-2"><Button type="submit" disabled={busy}><Save />{t.save}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}><X />{t.cancel}</Button></div>
    </form>}
    {query.data && rows.length === 0 && <p className="text-muted-foreground">{t.noRanges}</p>}
    {rows.length > 0 && <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3">{t.paper}</th><th>{t.bindPrice}</th><th>{t.coilSize}</th><th><span className="sr-only">{t.edit}</span></th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border">
        <td className="py-3 font-medium">{r.min_pages} – {r.max_pages}</td><td>₹{r.price.toFixed(2)}</td><td className="text-muted-foreground">{coilSizeForPages(r.max_pages)}</td>
        <td><div className="flex justify-end"><Button variant="ghost" size="icon" aria-label={t.edit} onClick={() => { setEditing({ id: r.id, range: { min_pages: r.min_pages, max_pages: r.max_pages, price: r.price } }); setError(""); }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t.deletePricing} disabled={busy} onClick={() => void del(r.id)}><Trash2 /></Button></div></td>
      </tr>)}</tbody></table>}
  </section>;
}
