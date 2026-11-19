import type { ReactNode } from "react";
import { Printer } from "lucide-react";

export function PolicyLinks() {
  return <span className="inline-flex flex-wrap justify-center gap-x-3 gap-y-1"><a href="/privacy" className="underline">Privacy</a><a href="/contact" className="underline">Contact</a></span>;
}
export function PublicInfo({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-5"><a href="/" className="flex items-center gap-2 font-display font-bold text-primary"><Printer className="h-6 w-6" />BOSS PrintGo</a><a href="/" className="text-sm text-primary underline">Home</a></header><main className="mx-auto max-w-3xl space-y-6 px-5 py-7"><h1 className="font-display text-2xl font-bold">{title}</h1>{children}</main><footer className="mx-auto max-w-3xl px-5 py-6 text-center text-xs text-muted-foreground"><PolicyLinks /></footer></div>;
}
