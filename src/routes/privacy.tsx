import { createFileRoute } from "@tanstack/react-router";
import { PublicInfo } from "@/components/public-info";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — BOSS PrintGo" }, { name: "description", content: "How BOSS PrintGo uses customer details, uploads and payments, including deletion after pickup." }] }),
  component: Privacy,
});
function Privacy() {
  return <PublicInfo title="Privacy Policy / தனியுரிமைக் கொள்கை"><p className="text-sm text-muted-foreground">Updated: 19 November 2026 · {BUSINESS.name} · Owner: {BUSINESS.owner}</p>
    <Section title="தகவல் சேகரிப்பு / Information collected"><p>Print orders நிறைவேற்ற உங்கள் பெயர், optional mobile number, customer category, uploaded documents/images, print settings மற்றும் order/payment references பயன்படுத்தப்படுகின்றன. Browser session cookies உங்கள் customer session-ஐ அடையாளம் காண உதவுகின்றன.</p></Section>
    <Section title="பயன்பாடு மற்றும் பாதுகாப்பு / Use and security"><p>கோப்புகள் print service வழங்குவதற்காக private storage-ல் வைக்கப்படுகின்றன. Authorised shop admin கோப்புகளை அணுகலாம். Hosting/storage/payment சேவைகளுக்கு Vercel, Supabase மற்றும் Razorpay பயன்படுத்தப்படுகின்றன; அவற்றின் செயல்பாட்டிற்குத் தேவையான தகவல்கள் அந்த providers மூலம் process செய்யப்படலாம். UPI PIN, OTP, முழு card credentials ஆகியவற்றை BOSS PrintGo சேமிப்பதில்லை.</p></Section>
    <Section title="Pickup-க்குப் பிறகு நீக்கம் / Deletion after pickup"><p>நீங்கள் print copies பெற்றுக்கொண்டதை admin “Picked up” என்று பதிவு செய்த நேரத்திலிருந்து 24 மணி நேரத்திற்குப் பிறகு customer history மற்றும் tracking entry மறைக்கப்படும்; uploaded print files மற்றும் payment screenshot இருந்தால் அவற்றையும் automatic cleanup மூலம் நீக்குவோம். Scheduled cleanup அடுத்த run-ல் நடைபெறும்; service interruption இருந்தால் retry செய்யப்படும். Order வைத்த நேரத்திலிருந்து இந்த 24 மணி நேரம் கணக்கிடப்படாது.</p><p>Pickup செய்யப்படாத orders மற்றும் payment உறுதியாகாத checkout files இந்த pickup விதியால் உடனடியாக நீக்கப்படாது; service/payment resolution அல்லது deletion request-க்கு எங்களைத் தொடர்புகொள்ளலாம்.</p></Section>
    <Section title="கணக்குப் பதிவுகள் / Business records"><p>File deletion என்பது முழு financial record deletion அல்ல. Order amount, payment reference மற்றும் தேவையான billing/accounting records சட்ட மற்றும் business record தேவைகளுக்காகத் தொடரலாம். Customer history-யில் expired entry காட்டப்படாது. ஏற்கனவே download/print செய்யப்பட்ட copies-ஐ server deletion திரும்பப் பெறாது.</p></Section>
    <Section title="உங்கள் கோரிக்கைகள் / Contact and requests"><p>Personal data correction/deletion, privacy அல்லது refund தொடர்பான கேள்விகளுக்கு <a className="break-all text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> அல்லது <a className="text-primary underline" href={`tel:+91${BUSINESS.mobile}`}>{BUSINESS.mobile}</a> மூலம் {BUSINESS.owner}-ஐத் தொடர்புகொள்ளலாம்.</p><p>{BUSINESS.address}</p></Section>
  </PublicInfo>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 text-sm leading-relaxed"><h2 className="font-display text-lg font-semibold">{title}</h2>{children}</section>;
}
