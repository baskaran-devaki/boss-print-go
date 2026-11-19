
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAccess } from "./pricing";

export const getShopStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    setResponseHeader("Cache-Control", "no-store");
    const { readShopStatus } = await import("./shop-status.server");
    return readShopStatus();
  });

export const setShopStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    isOpen: z.boolean(),
    closureReason: z.string().trim().max(300).default(""),
    reopensAt: z.string().datetime().nullable().default(null),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleError) throw new Error("Could not verify admin access.");
    requireAdminAccess(allowed);

    const client = context.supabase as unknown as import('@supabase/supabase-js').SupabaseClient;

    const { data: saved, error } = await client
      .from("shop_status")
      .update({
        is_open: data.isOpen,
        closure_reason: data.isOpen ? "" : data.closureReason,
        reopens_at: data.isOpen ? null : data.reopensAt,
      })
      .eq("id", true)
      .select("is_open, closure_reason, reopens_at")
      .single();

    if (error || !saved) throw new Error("Could not save shop status.");
    return {
      isOpen: saved.is_open as boolean,
      closureReason: String(saved.closure_reason ?? ""),
      reopensAt: (saved.reopens_at ?? null) as string | null,
    };
  });
