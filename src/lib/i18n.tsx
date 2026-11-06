import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "en" | "ta";
const dict = {
  en: {
    customerLogin: "Customer Login", category: "Category", schoolStudent: "School Student", collegeStudent: "College Student", others: "Others", continue: "Continue", welcome: "Welcome", customers: "Customers", customerCount: "Total Customers", visits: "Logins", lastVisit: "Last Login", history: "History", statusTab: "Status", noHistory: "No orders this month", noActive: "No active orders", monthlyHistory: "This month", monthlyReset: "History resets on the 1st of every month", refresh: "Refresh", newOrder: "New print order", customerEntryError: "Could not save your details. Please try again.", selectCategory: "Select category", trackInput: "Paste your private tracking link", openTracking: "Track", invalidTracking: "Enter a valid BOSS PrintGo tracking link.", switchCustomer: "Change customer", loadingCustomers: "Loading customers…", noCustomers: "No customers yet",
    tagline: "Upload • Pay • Pickup", loginTagline: "Let's cut the wait… and give time to learning!", loginDescription: "Send your files; pick up your prints once they're ready.", headerTagline: "Less waiting at the printer… more time to study!", upload: "Upload Files", drop: "Tap to choose PDF, JPG, JPEG or PNG",
    totalPages: "Total Pages", printedSides: "Total Printed Sides", detecting: "Counting pages…", remove: "Remove file",
    uploadErrors: { type: "Only PDF, JPG, JPEG and PNG files are supported.", size: "File exceeds 25 MB.", empty: "File is empty.", pages: "PDF must contain 1–1,000 pages.", password: "Password-protected PDFs are not supported. Upload an unlocked copy.", invalid: "Cannot read this file. It may be damaged or not match its file type." },
    settings: "Print Settings", color: "Color", bw: "Black & White", colorful: "Color",
    copies: "Copies", sides: "Sides", single: "Single", double: "Double", size: "Paper Size",
    service: "Service", pricingSettings: "Pricing Settings", standardRate: "Standard / side (₹)", bulkRate: "Bulk / side (₹)", bulkThreshold: "Bulk from (sides)", available: "Service available", enabled: "Enabled", disabled: "Disabled", addPricing: "Add pricing", save: "Save", cancel: "Cancel", edit: "Edit", deletePricing: "Delete pricing", saved: "Pricing saved", deleted: "Pricing deleted", noPricing: "No pricing configured", invalidPricing: "Enter positive prices with up to two decimals and a whole-number threshold.", priceError: "Could not verify pricing. Please try again.", loadingPricing: "Loading pricing…", unavailable: "Pricing unavailable for this service and print option.", bulkApplied: "Bulk rate applied", spiral: "Spiral Binding", spiralPrice: "Spiral binding", spiralNone: "Spiral binding not available for this page count.", spiralSettings: "Spiral Binding Prices", fromPages: "From pages", toPages: "To pages", bindPrice: "Price per set (₹)", addRange: "Add range", noRanges: "No binding ranges yet", invalidRange: "Enter valid pages and price.", verifyPrice: "Checking price…", priceChanged: "Price changed. Review the updated total and try again.", adminRequired: "This account does not have admin access.",
    details: "Your Details", name: "Name", mobileOptional: "Mobile (optional)",
    summary: "Price Summary", pages: "Pages", perPage: "Per printed side", total: "Total",
    payment: "Payment", upiId: "UPI ID", gpayNumber: "GPay Number", copy: "Copy", copied: "Copied!",
    scanToPay: "Scan to pay", utr: "UTR / Reference No.", utrPlaceholder: "UTR number (or upload screenshot below)",
    screenshotOptional: "Payment screenshot (UTR or screenshot — any one)", screenshotTooBig: "Screenshot exceeds 5 MB.", screenshotType: "Screenshot must be a JPG or PNG image.",
    submitOrder: "Submit Order", submittingOrder: "Submitting…", uploadHint: "Uploading files…",
    orderPlaced: "Order placed!", orderPlacedHint: "Payment is pending verification by the shop. Keep this tracking link.",
    orderId: "Order ID", trackingLink: "Tracking link", copyLink: "Copy link",
    paymentPending: "Pending Verification", paymentVerified: "Verified", paymentRejected: "Rejected",
    orderSubmitError: "Could not submit the order. Please try again.",
    track: "Track Order", trackTitle: "Track Order", trackNotFound: "We could not find this tracking link.", trackHint: "Open the tracking link you received after ordering.", orderedOn: "Ordered on",
    status: ["Received", "Printing", "Ready", "Picked up"],
    admin: "Admin", login: "Admin Login", email: "Email", password: "Password", signIn: "Sign in", home: "BOSS PrintGo home",
    orders: "Orders", dashboard: "Dashboard", revenue: "Revenue", pending: "Pending", logout: "Log out",
    customer: "Customer", amount: "Amount", paymentCol: "Payment", orderStatusCol: "Status", verify: "Verify", reject: "Reject", filesCol: "Files", advance: "Next", noOrders: "No orders yet", loadingOrders: "Loading orders…", paymentNote: "Payment stays pending until you verify the actual receipt. UTR and screenshot never approve payment automatically.",
    paymentSettings: "Payment Settings", payeeName: "Payee name", qrImageLabel: "Payment QR image", currentQr: "Current QR image", chooseQr: "Choose image", removeQr: "Remove", savePayment: "Save settings", paymentSaved: "Payment settings saved", invalidPaymentSettings: "Enter a valid UPI ID (name@bank), a 10-digit GPay number and a payee name.", qrHint: "Customers see this image on the payment card. A QR with the exact amount is generated automatically.",
  },
  ta: {
    customerLogin: "வாடிக்கையாளர் உள்நுழைவு", category: "வகை", schoolStudent: "பள்ளி மாணவர்", collegeStudent: "கல்லூரி மாணவர்", others: "மற்றவர்கள்", continue: "தொடரவும்", welcome: "வணக்கம்", customers: "வாடிக்கையாளர்கள்", customerCount: "மொத்த வாடிக்கையாளர்கள்", visits: "உள்நுழைவுகள்", lastVisit: "கடைசி உள்நுழைவு", history: "வரலாறு", statusTab: "நிலை", noHistory: "இந்த மாதம் ஆர்டர்கள் இல்லை", noActive: "செயலில் ஆர்டர்கள் இல்லை", monthlyHistory: "இந்த மாதம்", monthlyReset: "ஒவ்வொரு மாதமும் 1ஆம் தேதி வரலாறு புதிதாகத் தொடங்கும்", refresh: "புதுப்பி", newOrder: "புதிய அச்சு ஆர்டர்", customerEntryError: "விவரங்களைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", selectCategory: "வகையைத் தேர்வு செய்யவும்", trackInput: "உங்கள் தனிப்பட்ட ட்ராக்கிங் இணைப்பு", openTracking: "பார்", invalidTracking: "சரியான BOSS PrintGo ட்ராக்கிங் இணைப்பை உள்ளிடவும்.", switchCustomer: "வாடிக்கையாளரை மாற்று", loadingCustomers: "வாடிக்கையாளர்கள் ஏற்றப்படுகின்றனர்…", noCustomers: "இன்னும் வாடிக்கையாளர்கள் இல்லை",
    tagline: "பதிவேற்று • செலுத்து • பெறு", loginTagline: "காத்திருப்பைக் குறைப்போம்… கல்விக்கு நேரம் கொடுப்போம்!", loginDescription: "உங்கள் கோப்புகளை அனுப்புங்கள்; பிரிண்ட் தயாரானதும் வந்து பெற்றுக்கொள்ளுங்கள்.", headerTagline: "பிரிண்டுக்காக நிற்கும் நேரம்… இனி படிப்புக்காக!", upload: "கோப்புகளை பதிவேற்றவும்", drop: "PDF, JPG, JPEG அல்லது PNG தேர்வு செய்ய தட்டவும்",
    totalPages: "மொத்த பக்கங்கள்", printedSides: "மொத்த அச்சுப் பக்கங்கள்", detecting: "பக்கங்கள் கணக்கிடப்படுகின்றன…", remove: "கோப்பை நீக்கு",
    uploadErrors: { type: "PDF, JPG, JPEG மற்றும் PNG கோப்புகள் மட்டுமே அனுமதிக்கப்படும்.", size: "கோப்பு 25 MB-ஐ விடப் பெரியது.", empty: "கோப்பு காலியாக உள்ளது.", pages: "PDF-ல் 1–1,000 பக்கங்கள் இருக்க வேண்டும்.", password: "கடவுச்சொல் உள்ள PDF அனுமதிக்கப்படாது. திறக்கப்பட்ட நகலைப் பதிவேற்றவும்.", invalid: "கோப்பைப் படிக்க முடியவில்லை. அது சேதமடைந்திருக்கலாம் அல்லது தவறான கோப்பு வகையாக இருக்கலாம்." },
    settings: "அச்சு அமைப்புகள்", color: "நிறம்", bw: "கருப்பு வெள்ளை", colorful: "வண்ணம்",
    copies: "நகல்கள்", sides: "பக்கங்கள்", single: "ஒரு பக்கம்", double: "இரு பக்கம்", size: "காகித அளவு",
    service: "சேவை", pricingSettings: "விலை அமைப்புகள்", standardRate: "சாதாரண / பக்கம் (₹)", bulkRate: "மொத்த / பக்கம் (₹)", bulkThreshold: "தள்ளுபடி தொடங்கும் பக்கங்கள்", available: "சேவை கிடைக்கிறது", enabled: "செயலில்", disabled: "நிறுத்தப்பட்டது", addPricing: "விலையைச் சேர்", save: "சேமி", cancel: "ரத்து", edit: "திருத்து", deletePricing: "விலையை நீக்கு", saved: "விலை சேமிக்கப்பட்டது", deleted: "விலை நீக்கப்பட்டது", noPricing: "விலை அமைக்கப்படவில்லை", invalidPricing: "நேர்மறையான விலைகளையும் முழு எண் வரம்பையும் உள்ளிடவும்.", priceError: "விலையைச் சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", loadingPricing: "விலை ஏற்றப்படுகிறது…", unavailable: "இந்த சேவை மற்றும் அச்சு அமைப்பிற்கு விலை கிடைக்கவில்லை.", bulkApplied: "மொத்த தள்ளுபடி பயன்படுத்தப்பட்டது", spiral: "ஸ்பைரல் பைண்டிங்", spiralPrice: "ஸ்பைரல் பைண்டிங்", spiralNone: "இந்த பக்க எண்ணிக்கைக்கு ஸ்பைரல் பைண்டிங் இல்லை.", spiralSettings: "ஸ்பைரல் பைண்டிங் விலைகள்", fromPages: "முதல் பக்கம்", toPages: "கடைசி பக்கம்", bindPrice: "ஒரு செட் விலை (₹)", addRange: "வரம்பைச் சேர்", noRanges: "பைண்டிங் வரம்புகள் இல்லை", invalidRange: "சரியான பக்கங்களும் விலையும் உள்ளிடவும்.", verifyPrice: "விலை சரிபார்க்கப்படுகிறது…", priceChanged: "விலை மாறிவிட்டது. புதிய மொத்தத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.", adminRequired: "இந்தக் கணக்கிற்கு நிர்வாக அனுமதி இல்லை.",
    details: "உங்கள் விவரங்கள்", name: "பெயர்", mobileOptional: "தொலைபேசி (விருப்பம்)",
    summary: "விலை சுருக்கம்", pages: "பக்கங்கள்", perPage: "ஒரு அச்சுப் பக்கம்", total: "மொத்தம்",
    payment: "கட்டணம்", upiId: "UPI ஐடி", gpayNumber: "GPay எண்", copy: "நகல்", copied: "நகல் எடுக்கப்பட்டது!",
    scanToPay: "செலுத்த ஸ்கேன் செய்யவும்", utr: "UTR / குறிப்பு எண்", utrPlaceholder: "UTR எண் (அல்லது கீழே ஸ்கிரீன்ஷாட் பதிவேற்றவும்)",
    screenshotOptional: "கட்டண ஸ்கிரீன்ஷாட் (UTR அல்லது ஸ்கிரீன்ஷாட் — ஏதேனும் ஒன்று)", screenshotTooBig: "ஸ்கிரீன்ஷாட் 5 MB-ஐ விடப் பெரியது.", screenshotType: "ஸ்கிரீன்ஷாட் JPG அல்லது PNG ஆக இருக்க வேண்டும்.",
    submitOrder: "ஆர்டர் சமர்ப்பி", submittingOrder: "சமர்ப்பிக்கப்படுகிறது…", uploadHint: "கோப்புகள் பதிவேற்றப்படுகின்றன…",
    orderPlaced: "ஆர்டர் பதிவு ஆனது!", orderPlacedHint: "கட்டணம் கடையால் சரிபார்க்கப்பட வேண்டும். இந்த ட்ராக்கிங் இணைப்பை வைத்திருங்கள்.",
    orderId: "ஆர்டர் ஐடி", trackingLink: "ட்ராக்கிங் இணைப்பு", copyLink: "இணைப்பை நகல்",
    paymentPending: "சரிபார்ப்பு நிலுவையில்", paymentVerified: "சரிபார்க்கப்பட்டது", paymentRejected: "நிராகரிக்கப்பட்டது",
    orderSubmitError: "ஆர்டரை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    track: "ஆர்டர் நிலை", trackTitle: "ஆர்டர் நிலை", trackNotFound: "இந்த ட்ராக்கிங் இணைப்பு கிடைக்கவில்லை.", trackHint: "ஆர்டர் பதிவு செய்த பிறகு கிடைத்த ட்ராக்கிங் இணைப்பைத் திறக்கவும்.", orderedOn: "ஆர்டர் தேதி",
    status: ["பெறப்பட்டது", "அச்சிடுகிறது", "தயார்", "பெறப்பட்டது ✓"],
    admin: "நிர்வாகம்", login: "நிர்வாக உள்நுழைவு", email: "மின்னஞ்சல்", password: "கடவுச்சொல்", signIn: "உள்நுழை", home: "BOSS PrintGo முகப்பு",
    orders: "ஆர்டர்கள்", dashboard: "டாஷ்போர்டு", revenue: "வருவாய்", pending: "நிலுவையில்", logout: "வெளியேறு",
    customer: "வாடிக்கையாளர்", amount: "தொகை", paymentCol: "கட்டணம்", orderStatusCol: "நிலை", verify: "சரிபார்", reject: "நிராகரி", filesCol: "கோப்புகள்", advance: "அடுத்த நிலை", noOrders: "இன்னும் ஆர்டர்கள் இல்லை", loadingOrders: "ஆர்டர்கள் ஏற்றப்படுகின்றன…", paymentNote: "நீங்கள் உண்மையான ரசீதை சரிபார்க்கும் வரை கட்டணம் நிலுவையிலேயே இருக்கும். UTR மற்றும் ஸ்கிரீன்ஷாட் தானாக கட்டணத்தை உறுதிப்படுத்தாது.",
    paymentSettings: "கட்டண அமைப்புகள்", payeeName: "பெறுநர் பெயர்", qrImageLabel: "கட்டண QR படம்", currentQr: "தற்போதைய QR படம்", chooseQr: "படத்தைத் தேர்வு", removeQr: "நீக்கு", savePayment: "அமைப்புகளை சேமி", paymentSaved: "கட்டண அமைப்புகள் சேமிக்கப்பட்டன", invalidPaymentSettings: "சரியான UPI ஐடி (பெயர்@வங்கி), 10 இலக்க GPay எண் மற்றும் பெறுநர் பெயரை உள்ளிடவும்.", qrHint: "இந்தப் படம் வாடிக்கையாளருக்கு கட்டணப் பலகையில் தோன்றும். சரியான தொகையுடன் QR தானாக உருவாக்கப்படும்.",
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
