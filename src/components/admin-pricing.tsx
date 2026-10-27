import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deletePricing, getAdminPricing, savePricing } from "@/lib/pricing.functions";
import { pricingSchema, type Pricing, type PricingInput } from "@/lib/pricing";
import { useLang } from "@/lib/i18n";

const blank: PricingInput = { service: "xerox", paper_size: "A4", color_mode: "bw", standard_rate: 1, bulk_rate: 0.75, bulk_threshold: 50, available: true };
export function AdminPricing() {
  const { t } = useLang();
  const client = useQueryClient();
  const fetchPricing = useServerFn(getAdminPricing);
  const save = useServerFn(savePricing);
  const remove = useServerFn(deletePricing);
  const query = useQuery({ queryKey: ["admin-pricing"], queryFn: () => fetchPricing() });
  const [editing, setEditing] = useState<{ id?: string; pricing: PricingInput } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Pricing | null>(null);
  const [notice, setNotice] = useState("");

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["admin-pricing"] });
    await client.invalidateQueries({ queryKey: ["customer-pricing"] });
  }
  async function saveForm() {
    if (!editing) return;
    const result = pricingSchema.safeParse(editing.pricing);
    if (!result.success) { setError(t.invalidPricing); return; }
    setBusy(true); setError(""); setNotice("");
    try { await save({ data: { id: editing.id, pricing: result.data } }); setEditing(null); await refresh(); setNotice(t.saved); }
    catch (err) { setError(err instanceof Error ? err.message : t.priceError); }
    finally { setBusy(false); }
  }
  async function deleteRow() {
    if (!removing) return;
    setBusy(true); setError("");
    try { await remove({ data: { id: removing.id } }); setRemoving(null); await refresh(); setNotice(t.deleted); }
    catch (err) { setError(err instanceof Error ? err.message : t.priceError); }
    finally { setBusy(false); }
  }
  function field<K extends keyof PricingInput>(key: K, value: PricingInput[K]) {
    setEditing((current) => current ? { ...current, pricing: { ...current.pricing, [key]: value } } : null);
  }
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t.pricingSettings}</h2><Button onClick={() => { setEditing({ pricing: { ...blank } }); setError(""); setNotice(""); }}><Plus />{t.addPricing}</Button></div>
    {query.isPending && <p role="status">{t.loadingPricing}</p>}
    {(error || query.error) && <p role="alert" className="text-sm text-destructive">{error || query.error?.message}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {editing && <form className="space-y-4 border-y border-border py-4" onSubmit={(event) => { event.preventDefault(); void saveForm(); }}>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm"><span>{t.service}</span><select className="input-pg" value={editing.pricing.service} onChange={(e) => field("service", e.target.value === "xerox" ? "xerox" : "printout")}><option value="xerox">XEROX</option><option value="printout">PRINTOUT</option></select></label>
        <label className="space-y-1 text-sm"><span>{t.size}</span><select className="input-pg" value={editing.pricing.paper_size} onChange={(e) => field("paper_size", e.target.value === "A4" ? "A4" : "A3")}><option>A4</option><option>A3</option></select></label>
        <label className="space-y-1 text-sm"><span>{t.color}</span><select className="input-pg" value={editing.pricing.color_mode} onChange={(e) => field("color_mode", e.target.value === "bw" ? "bw" : "color")}><option value="bw">{t.bw}</option><option value="color">{t.colorful}</option></select></label>
        {([ ["standard_rate", t.standardRate], ["bulk_rate", t.bulkRate], ["bulk_threshold", t.bulkThreshold] ] as const).map(([key, label]) => <label key={key} className="space-y-1 text-sm"><span>{label}</span><input className="input-pg" type="number" required min={key === "bulk_threshold" ? 1 : 0.01} max={key === "bulk_threshold" ? 1000000 : 100000} step={key === "bulk_threshold" ? 1 : 0.01} value={Number.isNaN(editing.pricing[key]) ? "" : editing.pricing[key]} onChange={(e) => field(key, e.target.valueAsNumber)} /></label>)}
      </div>
      <label className="flex items-center gap-3 text-sm"><Switch checked={editing.pricing.available} onCheckedChange={(value) => field("available", value)} />{t.available}</label>
      <div className="flex gap-2"><Button type="submit" disabled={busy}><Save />{t.save}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}><X />{t.cancel}</Button></div>
    </form>}
    {removing && <div role="alertdialog" aria-label={t.deletePricing} className="space-y-3 border-y border-border py-4"><p>{t.deletePricing}: {removing.service.toUpperCase()} · {removing.paper_size} · {removing.color_mode === "bw" ? t.bw : t.colorful}?</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={() => void deleteRow()}><Trash2 />{t.deletePricing}</Button><Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>{t.cancel}</Button></div></div>}
    {query.data && query.data.length === 0 && <p className="text-muted-foreground">{t.noPricing}</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3">{t.service}</th><th>{t.standardRate}</th><th>{t.bulkRate}</th><th>{t.bulkThreshold}</th><th>{t.available}</th><th><span className="sr-only">{t.edit}</span></th></tr></thead><tbody>{query.data?.map((row) => <tr key={row.id} className="border-b border-border"><td className="py-3 pr-3 font-medium">{row.service.toUpperCase()}<p className="text-xs text-muted-foreground">{row.paper_size} · {row.color_mode === "bw" ? t.bw : t.colorful}</p></td><td className="pr-3">₹{Number(row.standard_rate).toFixed(2)}</td><td className="pr-3">₹{Number(row.bulk_rate).toFixed(2)}</td><td className="pr-3">{row.bulk_threshold}</td><td className="pr-3">{row.available ? t.enabled : t.disabled}</td><td><div className="flex"><Button variant="ghost" size="icon" title={t.edit} aria-label={`${t.edit} ${row.service} ${row.paper_size} ${row.color_mode}`} onClick={() => { const parsed = pricingSchema.parse(row); setEditing({ id: row.id, pricing: parsed }); setError(""); setNotice(""); }}><Pencil /></Button><Button variant="ghost" size="icon" title={t.deletePricing} aria-label={`${t.deletePricing} ${row.service} ${row.paper_size} ${row.color_mode}`} onClick={() => { setRemoving(row); setError(""); }}><Trash2 /></Button></div></td></tr>)}</tbody></table></div>
  </section>;
}