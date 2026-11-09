import { type ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getShopStatus, setShopStatus } from "@/lib/shop-status.functions";
import { Button } from "./ui/button";

function useShopStatus() {
  const read = useServerFn(getShopStatus);
  return useQuery({
    queryKey: ["shop-status"],
    queryFn: () => read(),
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    retry: 1,
  });
}

function reopeningText(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ShopStatusBadge() {
  const status = useShopStatus();
  const known = !!status.data && !status.isError;
  const open = known && status.data?.isOpen;

  return (
    <span
      role="status"
      className={
        "rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap " +
        (open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
      }
    >
      {!known ? "Checking..." : open ? "Shop Open" : "Shop Closed"}
    </span>
  );
}

export function ShopOrderGate({ children }: { children: ReactNode }) {
  const status = useShopStatus();

  if (status.isPending) {
    return <p role="status" className="p-6 text-center">Checking shop status...</p>;
  }

  if (status.isError || !status.data) {
    return (
      <section className="card-pg mx-4 space-y-3 text-center">
        <p role="alert">Could not check shop status.</p>
        <Button onClick={() => void status.refetch()}>Retry</Button>
      </section>
    );
  }

  if (!status.data.isOpen) {
    return (
      <section className="card-pg mx-4 space-y-4 py-12 text-center">
        <span className="inline-block rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
          Shop Closed
        </span>
        <h2 className="text-xl font-bold">இன்று கடைக்கு விடுமுறை</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          தற்போது புதிய ஆர்டர்கள் ஏற்கப்படவில்லை.
          கடை திறந்ததும் ஆர்டர் செய்யலாம்.
        </p>
        {status.data.closureReason && (
          <p className="break-words font-medium">{status.data.closureReason}</p>
        )}
        {status.data.reopensAt && (
          <div className="rounded-xl bg-muted p-3">
            <p className="mb-1 text-sm">மீண்டும் திறக்கும் நேரம்</p>
            <p className="font-semibold">
              {reopeningText(status.data.reopensAt)} IST
            </p>
          </div>
        )}
      </section>
    );
  }

  return <>{children}</>;
}

export function AdminShopStatus() {
  const status = useShopStatus();
  const save = useServerFn(setShopStatus);
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [reopens, setReopens] = useState("");
  const known = !!status.data && !status.isError;

  function editClosure() {
    setReason(status.data?.closureReason ?? "");
    const value = status.data?.reopensAt;
    setReopens(value
      ? new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16)
      : "");
    setError("");
    setNotice("");
    setEditing(true);
  }

  async function update(isOpen: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reopensAt = !isOpen && reopens
        ? new Date(reopens + ":00+05:30").toISOString()
        : null;

      if (reopensAt && new Date(reopensAt).getTime() <= Date.now()) {
        throw new Error("Choose a future reopening time.");
      }

      await client.cancelQueries({ queryKey: ["shop-status"] });
      const saved = await save({
        data: {
          isOpen,
          closureReason: isOpen ? "" : reason.trim(),
          reopensAt,
        },
      });
      client.setQueryData(["shop-status"], saved);
      setEditing(false);
      setNotice(isOpen ? "Shop opened." : "Closure details saved.");
      await client.invalidateQueries({ queryKey: ["shop-status"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save shop status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-pg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Shop Status</h2>
          <p className="text-sm">
            {!known ? "Checking status..." : status.data?.isOpen
              ? "Open - accepting orders"
              : "Closed - new orders blocked"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!known || busy} onClick={() => {
            if (status.data?.isOpen) editClosure();
            else void update(true);
          }}>
            {busy ? "Saving..." : status.data?.isOpen ? "Close Shop" : "Open Shop"}
          </Button>
          {known && !status.data?.isOpen && (
            <Button variant="outline" disabled={busy} onClick={editClosure}>
              Edit closure
            </Button>
          )}
        </div>
      </div>

      {known && !status.data?.isOpen && !editing && (
        <div className="space-y-1 text-sm">
          {status.data?.closureReason && <p>{status.data.closureReason}</p>}
          {status.data?.reopensAt && (
            <p>Reopens {reopeningText(status.data.reopensAt)} IST</p>
          )}
        </div>
      )}

      {editing && (
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          void update(false);
        }}>
          <label className="block space-y-1 text-sm">
            <span>Closure reason (optional)</span>
            <textarea className="input-pg" value={reason} maxLength={300}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Holiday / Maintenance" disabled={busy} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Reopening date and time - India time (optional)</span>
            <input className="input-pg" type="datetime-local" value={reopens}
              onChange={(event) => setReopens(event.target.value)} disabled={busy} />
          </label>
          <p className="text-xs text-muted-foreground">
            Reopening time is displayed to customers. Use Open Shop to resume orders.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save and close shop"}
            </Button>
            <Button type="button" variant="outline" disabled={busy}
              onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {status.isError && (
        <Button variant="outline" onClick={() => void status.refetch()}>
          Retry status
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
    </section>
  );
}
