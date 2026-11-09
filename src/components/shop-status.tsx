
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
    return <p className="p-6 text-center" role="status">Checking shop status...</p>;
  }

  if (status.isError || !status.data) {
    return (
      <section className="card-pg mx-4 text-center space-y-3">
        <p role="alert">Could not check shop status.</p>
        <Button onClick={() => void status.refetch()}>Retry</Button>
      </section>
    );
  }

  if (!status.data.isOpen) {
    return (
      <section className="card-pg mx-4 space-y-3 py-12 text-center">
        <h2 className="text-2xl font-bold text-red-600">Shop Closed</h2>
        <p>{"\u0ba4\u0bb1\u0bcd\u0baa\u0bcb\u0ba4\u0bc1 \u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd\u0b95\u0bb3\u0bcd \u0b8f\u0bb1\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bb5\u0ba4\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8."}</p>
        <p className="text-sm text-muted-foreground">
          Please order when the shop reopens.
        </p>
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
  const known = !!status.data && !status.isError;

  async function changeStatus() {
    if (!known || !status.data) return;
    setBusy(true);
    setError("");
    try {
      await client.cancelQueries({ queryKey: ["shop-status"] });
      const saved = await save({ data: { isOpen: !status.data.isOpen } });
      client.setQueryData(["shop-status"], saved);
      await client.invalidateQueries({ queryKey: ["shop-status"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save shop status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-pg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Shop Status</h2>
          <p className="text-sm">
            {!known ? "Status unavailable" : status.data?.isOpen ? "Open - accepting orders" : "Closed - new orders blocked"}
          </p>
        </div>
        <Button disabled={!known || busy} onClick={() => void changeStatus()}>
          {busy ? "Saving..." : status.data?.isOpen ? "Close Shop" : "Open Shop"}
        </Button>
      </div>
      {status.isError && <Button variant="outline" onClick={() => void status.refetch()}>Retry status</Button>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
