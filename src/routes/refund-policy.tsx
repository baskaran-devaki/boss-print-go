import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicInfo } from "@/components/public-info";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [{ title: "Cancellation & Refund Policy — BOSS PrintGo" }, { name: "description", content: "How to request cancellation, report payment issues and receive eligible printing-service refunds from BOSS PrintGo." }] }),
  component: RefundPolicy,
});
function RefundPolicy() {
  return <PublicInfo title="Cancellation & Refund Policy / ரத்து மற்றும் பணம் திரும்பப்பெறுதல்">
    <p className="text-sm text-muted-foreground">Effective: 19 November 2026 · {BUSINESS.name} · Owner: {BUSINESS.owner}</p>
    <Section title="1. How to request cancellation / ரத்து செய்வது எப்படி">
      <p>Call <a className="text-primary underline" href={`tel:+91${BUSINESS.mobile}`}>{BUSINESS.mobile}</a> or email <a className="break-all text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> as soon as possible. Include your order ID (if available), payment reference, date, amount and reason. Cancellation and refund requests are handled by the shop; closing checkout or leaving the app is not a refund request for a successful payment.</p>
      <p>ரத்து செய்ய உடனே phone / email மூலம் தொடர்புகொள்ளவும். Order ID, payment reference, தொகை மற்றும் காரணம் கொடுக்கவும். OTP, UPI PIN அல்லது card password பகிர வேண்டாம்.</p>
    </Section>
    <Section title="2. Before printing starts / Print தொடங்குவதற்கு முன்">
      <p>If we confirm cancellation before any printing/binding work has started, the paid order is eligible for a full refund, including the BOSS PrintGo platform fee. Please contact us promptly: payment confirmation can be followed by printing, and a cancellation request is not confirmed until the shop acknowledges that work has been stopped.</p>
      <p>Print / binding வேலை தொடங்குவதற்கு முன் cancellation-ஐ கடை உறுதி செய்தால் முழுத் தொகையும் refund செய்யத் தகுதி உண்டு. ரத்து கோரிக்கை அனுப்பியது மட்டுமே வேலை நிறுத்தப்பட்டதற்கான உறுதி அல்ல; கடையில் உறுதி செய்யவும்.</p>
    </Section>
    <Section title="3. After work starts and print errors / வேலை தொடங்கிய பிறகு">
      <p>Change-of-mind cancellations and customer-supplied wrong files/settings are not normally refundable for work already completed correctly. If BOSS PrintGo made a printing/binding error, contact us promptly with the order reference and affected copies so we can assess a corrected reprint or a refund for the affected part. If we cannot fulfil a paid order, we will refund the unfulfilled portion and the corresponding proportion of the BOSS PrintGo platform fee; if no work was supplied, a full refund applies. Your applicable consumer rights remain unaffected.</p>
      <p>சரியாக முடிக்கப்பட்ட வேலைக்கு customer file / settings தவறு அல்லது மனமாற்றம் காரணமாக பொதுவாக refund கிடையாது. எங்கள் தவறால் பிரச்சினை ஏற்பட்டால் பாதிக்கப்பட்ட copies-ஐச் சரிபார்த்து reprint அல்லது பொருந்தும் refund மூலம் தீர்வு வழங்குவோம். சேவை வழங்க முடியாத பகுதிக்கான பணம் திருப்பப்படும்.</p>
    </Section>
    <Section title="4. Failed, pending or duplicate payments / Payment பிரச்சினைகள்">
      <p>If money is debited but the app shows failed/pending, contact us with the transaction reference before paying again. We check the final Razorpay/bank status: some initially failed or interrupted payments can later succeed. Truly failed payments are reversed by the bank/payment provider under the applicable reversal timelines. A successful payment that needs cancellation follows this policy. A verified duplicate successful charge for the same order will be refunded.</p>
      <p>பணம் கழிந்தும் failure / pending வந்தால் மீண்டும் செலுத்துவதற்கு முன் எங்களைத் தொடர்புகொள்ளவும். Final payment status சரிபார்க்கப்படும். ஒரே order-க்கு கூடுதலாக successful payment ஏற்பட்டது உறுதியானால் கூடுதல் தொகை refund செய்யப்படும்.</p>
    </Section>
    <Section title="5. Refund method and timing / Refund முறை மற்றும் காலம்">
      <p>Once a refund is approved, BOSS PrintGo will initiate it within 2 working days and provide the refund reference when available. Online payment refunds are sent through Razorpay to the original payment method. Bank credit is separate from refund initiation and usually takes around 7–10 working days after initiation; the actual time depends on the payment method and bank. Failed-payment automatic reversals follow the bank/payment provider's own applicable timelines, not this merchant approval period.</p>
      <p>Refund approve ஆன பிறகு 2 வேலை நாட்களுக்குள் refund initiate செய்வோம். Original payment method-க்கே பணம் திருப்பப்படும். Bank-ல் வர பொதுவாக initiate செய்ததிலிருந்து சுமார் 7–10 வேலை நாட்கள் ஆகலாம்; bank / payment முறையைப் பொறுத்து நேரம் மாறும். இது துல்லியமான credit-time guarantee அல்ல.</p>
    </Section>
    <Section title="6. Refund follow-up / Refund உதவி">
      <p>If the refund has not arrived within the advised period, contact us with your order/payment/refund reference. We can share the available refund status/reference for you to check with your bank. Deleted customer history or print files do not by themselves remove an eligible refund claim; keep your payment reference for follow-up.</p>
      <p>{BUSINESS.owner} · <a className="text-primary underline" href={`tel:+91${BUSINESS.mobile}`}>{BUSINESS.mobile}</a> · <a className="break-all text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p><p>{BUSINESS.address}</p>
    </Section>
  </PublicInfo>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 text-sm leading-relaxed"><h2 className="font-display text-lg font-semibold">{title}</h2>{children}</section>;
}
