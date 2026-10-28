import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminPaymentSettings, savePaymentSettings } from "@/lib/orders.functions";
import { paymentSettingsSchema } from "@/lib/orders";
import { useLang } from "@/lib/i18n";

async function readQrDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export function AdminPaymentSettings() {
  const { t } = useLang();
  const client = useQueryClient();
  const fetchSettings = useServerFn(getAdminPaymentSettings);
  const save = useServerFn(savePaymentSettings);
  const query = useQuery({ queryKey: ["admin-payment-settings"], queryFn: () => fetchSettings() });
  const [upiId, setUpiId] = useState("");
  const [gpayNumber, setGpayNumber] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.data && !loaded) {
      setUpiId(query.data.upiId);
      setGpayNumber(query.data.gpayNumber);
      setPayeeName(query.data.payeeName);
      setQrImage(query.data.qrImage);
      setLoaded(true);
    }
  }, [query.data, loaded]);

  function chooseQr(file: File | null) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png"].includes(file.type)) { setError(t.screenshotType); return; }
    if (file.size > 5 * 1024 * 1024) { setError(t.screenshotTooBig); return; }
    readQrDataUrl(file)
      .then(setQrImage)
      .catch(() => setError(t.screenshotType));
  }

  async function saveForm() {
    const parsed = paymentSettingsSchema.safeParse({ upiId, gpayNumber, payeeName, qrImage: qrImage ?? "" });
    if (!parsed.success) { setError(t.invalidPaymentSettings); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await save({ data: parsed.data });
      await client.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      await client.invalidateQueries({ queryKey: ["payment-settings"] });
      setNotice(t.paymentSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.priceError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold">{t.paymentSettings}</h2>
      {query.isPending && <p role="status">{t.loadingPricing}</p>}
      {(error || query.error) && <p role="alert" className="text-sm text-destructive">{error || query.error?.message}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
      {query.data && (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void saveForm(); }}>
          <label className="space-y-1 text-sm"><span>{t.payeeName}</span><input className="input-pg" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} required maxLength={60} /></label>
          <label className="space-y-1 text-sm"><span>{t.upiId}</span><input className="input-pg" value={upiId} onChange={(e) => setUpiId(e.target.value)} required placeholder="number@upi" /></label>
          <label className="space-y-1 text-sm"><span>{t.gpayNumber}</span><input className="input-pg" value={gpayNumber} onChange={(e) => setGpayNumber(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" maxLength={10} placeholder="10-digit number" /></label>
          <div className="space-y-1 text-sm">
            <span>{t.qrImageLabel}</span>
            <div className="flex items-center gap-3">
              {qrImage && <img src={qrImage} alt={t.currentQr} className="h-20 w-20 rounded-xl border border-border object-contain" />}
              <label className="btn-soft inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"><ImageUp className="h-4 w-4" />{t.chooseQr}<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; chooseQr(f ?? null); }} /></label>
              {qrImage && <Button type="button" variant="ghost" size="icon" aria-label={t.removeQr} onClick={() => setQrImage(null)}><Trash2 /></Button>}
            </div>
            <p className="text-xs text-muted-foreground">{t.qrHint}</p>
          </div>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}><Save />{t.savePayment}</Button></div>
        </form>
      )}
    </section>
  );
}
