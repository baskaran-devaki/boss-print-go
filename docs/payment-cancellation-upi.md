# Cancelled checkout and Android UPI update

Baseline: GitHub main 8ff713a. This patch updates the existing checkout; it does not include credentials and does not change Vercel keys.

## Result

- Dismissing or failing web/native checkout resets files, paper, colour, sides, copies and binding to a fresh order form. No Check payment status or Continue saved payment controls.
- Gateway drafts stay internal until a captured payment is verified, with a payment ID. Server queries filter them before limiting rows, so admin counts/revenue and customer Status/History do not include cancellations. SQL also restricts authenticated admin reads/updates and public tracking. Manual receipt orders keep their existing workflow.
- Draft records/files are retained for late payment webhooks. Never delete a draft on a browser cancellation: a bank callback may still arrive. Confirmed payments appear once, on the same existing order. Automatic background recovery is silent and never interrupts a new form.
- Already cancelled unpaid gateway records also disappear from admin lists after applying this update. Gateway payment status cannot be manually verified/rejected through the admin controls.
- Android calls a local Capacitor 8 bridge to Razorpay Android Standard Checkout (SDK coordinate 1.6.40, per current official integration documentation). UPI is highlighted first in checkout. The SDK can discover installed UPI apps; the merchant account must have UPI enabled. The API secret stays on Vercel. Callbacks still require server signature and capture verification.

## Apply on Windows

Download boss-printgo-payment-fix.patch into Downloads. In the project root:

```powershell
git apply --check "$HOME\Downloads\boss-printgo-payment-fix.patch"
# Only if the check succeeds:
git apply "$HOME\Downloads\boss-printgo-payment-fix.patch"
npm install
node scripts/install-razorpay-android.mjs
npx cap sync android
npm run build
```

The Android installer validates your existing Java MainActivity/Gradle/manifest before changing anything, registers the bridge, writes the two native classes next to MainActivity, adds the SDK dependency, activity/UPI discovery manifest entries and Proguard rules. It keeps .boss-razorpay.bak copies of existing files. It does not replace your app ID, icon, server URL, signing configuration or other native code. Running it twice does not duplicate entries. If it reports an unsupported layout, send that error; do not replace MainActivity by hand. The Java source templates are in native/razorpay/ and should remain tracked even though generated Android files are currently untracked.

Run drizzle/migrations/0010_hide_unpaid_checkouts.sql in your own Supabase SQL Editor. It requires migration 0009 to have already been applied. No orders or uploads are deleted.

Commit only this update's source files, not all untracked Android/release files:

```powershell
git add .gitignore AGENTS.md docs/razorpay-setup.md docs/payment-cancellation-upi.md src/components/admin-orders.tsx src/lib/customers.functions.ts src/lib/orders.functions.ts src/lib/orders.ts src/lib/razorpay-checkout.ts src/lib/razorpay-checkout.test.ts src/lib/order-visibility.test.ts src/routes/index.tsx drizzle/migrations/0010_hide_unpaid_checkouts.sql native/razorpay/BossRazorpayPlugin.java native/razorpay/BossRazorpayActivity.java scripts/install-razorpay-android.mjs scripts/install-razorpay-android.test.mjs
git commit -m "Reset cancelled checkout, hide unpaid drafts, add Android UPI checkout"
git push origin main
```

If push is rejected, merge normally, resolve conflicts preserving both features, build and push. Never force push. Wait for Vercel Ready. Android Studio: Gradle Sync, then build/install a new signed APK using your existing keystore. A Vercel redeploy alone cannot add a native Android plugin. Old APKs show an update message before taking payment rather than silently falling back to a WebView without UPI support. Test browser cancellation as soon as Vercel is ready, then test the rebuilt APK.

## Test

1. In Test Mode, upload a document, choose settings, enter checkout and cancel. The form must be empty/default, with no saved-payment buttons. Refresh admin/customer lists: the cancelled draft must not appear.
2. Simulate a failed payment. Check the same behaviour. Try another fresh order.
3. Complete a test payment. Exactly one confirmed order must appear in admin, with the correct sides/binding/amount/files. The webhook and browser verification may race; both update the same record.
4. Close/reopen during successful payment. The signed captured webhook must still promote the saved record, with no unpaid drafts shown. Check Status/History after confirmation.
5. Build/install the new APK. Check the native checkout opens, then test native cancel/back and failure. Existing APKs without BossRazorpay must fail before file upload/order creation with an update instruction.
6. Real GPay/PhonePe intent switching requires Live Mode and enabled UPI on the merchant account; Test Mode is a simulation and cannot establish real UPI-app handoff. After test checkout passes, configure matching Live API keys and a Live payment.captured webhook, then test a small real order on a real phone with a supported UPI app installed. Do not mix Test keys with Live webhook configuration.

Checks available here: TypeScript, production web build, Vitest (checkout cancellation/failure/native dispatch, signature/capture security, admin filtering), and Node fixture tests for the native installer. The actual Android project is local/untracked on your PC, and no Android SDK/device is available here; APK compilation and real UPI return must be verified in your Android Studio/device.

Official references:
- https://razorpay.com/docs/payments/payment-gateway/android-integration/standard/integration-steps/
- https://razorpay.com/docs/payments/payment-gateway/android-integration/standard/test-integration/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/sample-code/
- https://capacitorjs.com/docs/plugins/android
