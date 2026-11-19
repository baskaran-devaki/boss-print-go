import { createFileRoute } from "@tanstack/react-router";
import { PublicInfo } from "@/components/public-info";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact & Owner — BOSS PrintGo" }, { name: "description", content: "BOSS PrintGo shop contact, owner, address and support." }] }),
  component: Contact,
});
function Contact() {
  return <PublicInfo title="Contact / தொடர்புக்கு"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-5 text-lg font-bold">{BUSINESS.name}</h2><dl className="space-y-4 text-sm leading-relaxed"><div><dt className="text-muted-foreground">உரிமையாளர் / Owner</dt><dd className="font-semibold">{BUSINESS.owner}</dd></div><div><dt className="text-muted-foreground">Mobile</dt><dd><a className="text-primary underline" href={`tel:+91${BUSINESS.mobile}`}>{BUSINESS.mobile}</a></dd></div><div><dt className="text-muted-foreground">Address</dt><dd>{BUSINESS.address}</dd></div><div><dt className="text-muted-foreground">Email</dt><dd><a className="break-all text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></dd></div></dl></section><p className="text-sm leading-relaxed text-muted-foreground">Order, payment, refund அல்லது personal data தொடர்பான உதவிக்கு எங்களைத் தொடர்புகொள்ளுங்கள். Order ID / payment reference கொடுக்கலாம். UPI PIN, OTP அல்லது card password பகிர வேண்டாம்.</p></PublicInfo>;
}
