import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicInfo } from "@/components/public-info";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — BOSS PrintGo" }, { name: "description", content: "Terms for document uploads, print settings, payment, pickup and support at BOSS PrintGo." }] }),
  component: Terms,
});
function Terms() {
  return <PublicInfo title="Terms & Conditions / பயன்பாட்டு விதிமுறைகள்">
    <p className="text-sm text-muted-foreground">Effective: 19 November 2026 · {BUSINESS.name} · Owner: {BUSINESS.owner}</p>
    <Section title="1. Our service / எங்கள் சேவை">
      <p>BOSS PrintGo lets customers upload documents, choose available printing/binding options, pay online and collect their physical prints from our shop. These terms apply to orders placed through our website and Android app.</p>
      <p>எங்கள் website / Android app மூலம் கோப்புகளை அனுப்பி, print settings தேர்வு செய்து, payment முடித்து, தயாரான print copies-ஐ கடையில் பெற்றுக்கொள்ளலாம்.</p>
    </Section>
    <Section title="2. Your documents and settings / கோப்புகள் மற்றும் தேர்வுகள்">
      <p>Before payment, check your document, page count, paper size, colour, single/double-sided option, copies, binding and total amount. You must have permission to print the files you submit. Do not upload unlawful material or files belonging to someone else without permission.</p>
      <p>Payment செய்வதற்கு முன் file, pages, paper size, colour, sides, copies, binding மற்றும் total amount சரிபார்க்கவும். நீங்கள் கொடுத்த file / settings அடிப்படையிலேயே print செய்யப்படும்.</p>
    </Section>
    <Section title="3. Customer details and authorised use / வாடிக்கையாளர் விவரங்கள்">
      <p>Provide an accurate name and, if supplied, a working mobile number so we can identify your order. Use a payment method you are authorised to use. If you are under 18, use the service with a parent or guardian's permission and an authorised payment method.</p>
      <p>சரியான பெயர் மற்றும் கொடுத்தால் தொடர்புகொள்ளக்கூடிய mobile number வழங்கவும். 18 வயதுக்குக் குறைவானவர்கள் பெற்றோர் / பாதுகாவலர் அனுமதியுடன் பயன்படுத்தவும்.</p>
    </Section>
    <Section title="4. Pricing and payment / விலை மற்றும் கட்டணம்">
      <p>The app displays the order total before checkout. Review the total before paying. The server checks the current price again when preparing payment; if prices changed, you must review the updated quote. Online payments are processed through Razorpay. Only a payment confirmed by our server is treated as a paid order.</p>
      <p>Checkout-க்கு முன் காட்டப்படும் total-ஐப் பார்த்து payment செய்யவும். விலை மாறியிருந்தால் புதிய total-ஐ உறுதி செய்ய வேண்டும். Bank debit message மட்டும் order confirmation ஆகாது; payment verification தேவை.</p>
    </Section>
    <Section title="5. Processing and pickup / Print மற்றும் பெற்றுக்கொள்ளுதல்">
      <p>Processing depends on shop availability, order size and document quality. Check the order's Ready status or confirm with the shop before travelling. Collect your prints at our shop using your order reference. An unexpected closure or inability to fulfil a paid order will be handled under our refund policy.</p>
      <p>Order “Ready” ஆனதும் அல்லது கடையில் உறுதி செய்த பிறகு வந்து பெற்றுக்கொள்ளவும். Shop closed ஆக இருந்தால் புதிய orders ஏற்கப்படாது; ஏற்கனவே payment செய்த order தொடர்பாக எங்களைத் தொடர்புகொள்ளலாம்.</p>
    </Section>
    <Section title="6. Changes, cancellation and quality issues / மாற்றம் மற்றும் ரத்து">
      <p>Contact the shop immediately if you need to change or cancel an order. Changes depend on whether printing/binding has already started. Closing the payment window is not a cancellation request for a payment that has already succeeded. See our <a className="text-primary underline" href="/refund-policy">Cancellation & Refund Policy</a> for eligibility, remedies and timelines.</p>
      <p>File / settings மாற்றம் அல்லது cancellation தேவைப்பட்டால் உடனே கடையைத் தொடர்புகொள்ளவும். Print தொடங்கிய பிறகு செய்த வேலைக்கான cancellation பொதுவாகக் கிடைக்காது. எங்கள் தவறால் print பிரச்சினை இருந்தால் சரிசெய்தல் / பொருந்தும் refund வழங்கப்படும்.</p>
    </Section>
    <Section title="7. Files and customer history / கோப்புகள் மற்றும் History">
      <p>After the shop records pickup as Picked up, customer history/tracking expires 24 hours later. Uploaded print files and any payment screenshot are then removed by scheduled cleanup. Save your originals and order/payment references yourself. Financial records may be retained separately. Full details are in our <a className="text-primary underline" href="/privacy">Privacy Policy</a>.</p>
      <p>Admin “Picked up” பதிவு செய்த நேரத்திலிருந்து 24 மணி நேரத்திற்குப் பிறகு customer History/Tracking மறையும்; files automatic cleanup மூலம் நீக்கப்படும். உங்கள் original files மற்றும் payment reference-ஐ நீங்களே பாதுகாக்கவும்.</p>
    </Section>
    <Section title="8. Support and your rights / உதவி மற்றும் உரிமைகள்">
      <p>For an order, payment, quality or privacy issue, contact {BUSINESS.owner} at <a className="text-primary underline" href={`tel:+91${BUSINESS.mobile}`}>{BUSINESS.mobile}</a> or <a className="break-all text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. Shop address: {BUSINESS.address}</p>
      <p>We will explain the proposed resolution and any eligible refund. These terms do not remove rights or remedies available to customers under applicable law. Updated terms apply to future orders; they do not retrospectively reduce rights for an existing order.</p>
    </Section>
  </PublicInfo>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 text-sm leading-relaxed"><h2 className="font-display text-lg font-semibold">{title}</h2>{children}</section>;
}
