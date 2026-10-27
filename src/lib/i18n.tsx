import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "en" | "ta";
const dict = {
  en: {
    tagline: "Upload • Pay • Pickup", upload: "Upload Files", drop: "Tap to choose PDF, JPG, JPEG or PNG",
    totalPages: "Total Pages", printedSides: "Total Printed Sides", detecting: "Counting pages…", remove: "Remove file", paid: "Paid",
    uploadErrors: { type: "Only PDF, JPG, JPEG and PNG files are supported.", size: "File exceeds 25 MB.", empty: "File is empty.", pages: "PDF must contain 1–1,000 pages.", password: "Password-protected PDFs are not supported. Upload an unlocked copy.", invalid: "Cannot read this file. It may be damaged or not match its file type." },
    settings: "Print Settings", color: "Color", bw: "Black & White", colorful: "Color",
    copies: "Copies", sides: "Sides", single: "Single", double: "Double", size: "Paper Size",
    service: "Service", pricingSettings: "Pricing Settings", standardRate: "Standard / side (₹)", bulkRate: "Bulk / side (₹)", bulkThreshold: "Bulk from (sides)", available: "Service available", enabled: "Enabled", disabled: "Disabled", addPricing: "Add pricing", save: "Save", cancel: "Cancel", edit: "Edit", deletePricing: "Delete pricing", saved: "Pricing saved", deleted: "Pricing deleted", noPricing: "No pricing configured", invalidPricing: "Enter positive prices with up to two decimals and a whole-number threshold.", priceError: "Could not verify pricing. Please try again.", loadingPricing: "Loading pricing…", unavailable: "Pricing unavailable for this service and print option.", bulkApplied: "Bulk rate applied", verifyPrice: "Checking price…", priceChanged: "Price changed. Review the updated total and try again.", adminRequired: "This account does not have admin access.",
    details: "Your Details", name: "Name", phone: "Phone", college: "College / Dept",
    summary: "Price Summary", pages: "Pages", perPage: "Per printed side", total: "Total",
    payment: "Payment", payNow: "Pay Now", track: "Track Order", status: ["Received", "Printing", "Ready", "Picked up"],
    admin: "Admin", login: "Admin Login", email: "Email", password: "Password", signIn: "Sign in",
    orders: "Orders", dashboard: "Dashboard", revenue: "Revenue", pending: "Pending", logout: "Log out",
  },
  ta: {
    tagline: "பதிவேற்று • செலுத்து • பெறு", upload: "கோப்புகளை பதிவேற்றவும்", drop: "PDF, JPG, JPEG அல்லது PNG தேர்வு செய்ய தட்டவும்",
    totalPages: "மொத்த பக்கங்கள்", printedSides: "மொத்த அச்சுப் பக்கங்கள்", detecting: "பக்கங்கள் கணக்கிடப்படுகின்றன…", remove: "கோப்பை நீக்கு", paid: "செலுத்தப்பட்டது",
    uploadErrors: { type: "PDF, JPG, JPEG மற்றும் PNG கோப்புகள் மட்டுமே அனுமதிக்கப்படும்.", size: "கோப்பு 25 MB-ஐ விடப் பெரியது.", empty: "கோப்பு காலியாக உள்ளது.", pages: "PDF-ல் 1–1,000 பக்கங்கள் இருக்க வேண்டும்.", password: "கடவுச்சொல் உள்ள PDF அனுமதிக்கப்படாது. திறக்கப்பட்ட நகலைப் பதிவேற்றவும்.", invalid: "கோப்பைப் படிக்க முடியவில்லை. அது சேதமடைந்திருக்கலாம் அல்லது தவறான கோப்பு வகையாக இருக்கலாம்." },
    settings: "அச்சு அமைப்புகள்", color: "நிறம்", bw: "கருப்பு வெள்ளை", colorful: "வண்ணம்",
    copies: "நகல்கள்", sides: "பக்கங்கள்", single: "ஒரு பக்கம்", double: "இரு பக்கம்", size: "காகித அளவு",
    service: "சேவை", pricingSettings: "விலை அமைப்புகள்", standardRate: "சாதாரண / பக்கம் (₹)", bulkRate: "மொத்த / பக்கம் (₹)", bulkThreshold: "தள்ளுபடி தொடங்கும் பக்கங்கள்", available: "சேவை கிடைக்கிறது", enabled: "செயலில்", disabled: "நிறுத்தப்பட்டது", addPricing: "விலையைச் சேர்", save: "சேமி", cancel: "ரத்து", edit: "திருத்து", deletePricing: "விலையை நீக்கு", saved: "விலை சேமிக்கப்பட்டது", deleted: "விலை நீக்கப்பட்டது", noPricing: "விலை அமைக்கப்படவில்லை", invalidPricing: "நேர்மறையான விலைகளையும் முழு எண் வரம்பையும் உள்ளிடவும்.", priceError: "விலையைச் சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", loadingPricing: "விலை ஏற்றப்படுகிறது…", unavailable: "இந்த சேவை மற்றும் அச்சு அமைப்பிற்கு விலை கிடைக்கவில்லை.", bulkApplied: "மொத்த தள்ளுபடி பயன்படுத்தப்பட்டது", verifyPrice: "விலை சரிபார்க்கப்படுகிறது…", priceChanged: "விலை மாறிவிட்டது. புதிய மொத்தத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.", adminRequired: "இந்தக் கணக்கிற்கு நிர்வாக அனுமதி இல்லை.",
    details: "உங்கள் விவரங்கள்", name: "பெயர்", phone: "தொலைபேசி", college: "கல்லூரி / துறை",
    summary: "விலை சுருக்கம்", pages: "பக்கங்கள்", perPage: "ஒரு அச்சுப் பக்கம்", total: "மொத்தம்",
    payment: "கட்டணம்", payNow: "இப்போது செலுத்து", track: "ஆர்டர் நிலை", status: ["பெறப்பட்டது", "அச்சிடுகிறது", "தயார்", "பெறப்பட்டது ✓"],
    admin: "நிர்வாகம்", login: "நிர்வாக உள்நுழைவு", email: "மின்னஞ்சல்", password: "கடவுச்சொல்", signIn: "உள்நுழை",
    orders: "ஆர்டர்கள்", dashboard: "டாஷ்போர்டு", revenue: "வருவாய்", pending: "நிலுவையில்", logout: "வெளியேறு",
  },
};
type Dict = typeof dict.en;
const Ctx = createContext<{ lang: Lang; t: Dict; toggle: () => void }>({ lang: "en", t: dict.en, toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return <Ctx.Provider value={{ lang, t: dict[lang] as Dict, toggle: () => setLang(lang === "en" ? "ta" : "en") }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);

export function LangToggle() {
  const { lang, toggle } = useLang();
  return <button onClick={toggle} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary">{lang === "en" ? "தமிழ்" : "English"}</button>;
}
