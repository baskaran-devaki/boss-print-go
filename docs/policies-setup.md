# Terms and cancellation/refund pages

Baseline: GitHub main 789f9fe. This patch adds public /terms and /refund-policy pages using the existing owner/contact details. Existing Privacy/Contact links remain; short Terms/Refunds links are added to the same footer and the new policies are linked before Pay & Place Order. No SQL, new secret, payment API change, deletion schedule change or APK rebuild is needed for the current remote-URL Android app.

## Business policy included for owner review

- Contact the shop by phone/email for cancellation, changes or refund; leaving checkout does not cancel an already-successful payment.
- If the shop confirms cancellation before any printing/binding starts, the order qualifies for a full refund.
- No routine change-of-mind/customer-file-error refund for work already completed correctly. Shop printing errors are assessed for corrected reprint or refund of the affected part. Unfulfilled paid service is refunded. Statutory customer rights are preserved.
- Verified duplicate successful payments for the same order qualify for refund.
- Owner initiates approved refunds within 2 working days; this is a new service commitment in the written policy. Bank credit is separate and described as usually around 7–10 working days after initiation, dependent on bank/method. Failed-payment reversals follow applicable bank/provider timelines instead of the merchant approval period.
- Deleted files/history do not themselves remove eligible refund claims. Accounting/payment records and customer payment references can support follow-up.

These are policy pages, not a new cancellation/refund workflow. Refunds still need to be initiated manually by the owner in Razorpay. This patch does not add self-service refund buttons, automatically cancel printing, or update the app's accounting totals for refunds. Record actual refunds in your bookkeeping and reconcile them with Razorpay.

## Apply and publish

Save boss-printgo-policies.patch into Downloads. In Android Studio terminal at the project root:

```powershell
git apply --check "$HOME\Downloads\boss-printgo-policies.patch"
# If the check has no errors:
git apply "$HOME\Downloads\boss-printgo-policies.patch"
npm run build
```

Review the policy text, especially the 2-working-day initiation commitment and cancellation conditions, then commit the six update files:

```powershell
git add docs/policies-setup.md src/components/public-info.tsx src/routes/index.tsx src/routes/terms.tsx src/routes/refund-policy.tsx src/routeTree.gen.ts
git commit -m "Add terms and cancellation refund policies"
git push origin main
```

Do not use git add . or force push. After Vercel Ready, visit without login:

- https://boss-print-go.vercel.app/terms
- https://boss-print-go.vercel.app/refund-policy

Check that Privacy, Terms, Refunds and Contact footer links open the right pages, including on mobile. Confirm the payment-page links open separately so the selected upload is not lost. Login links use short labels to preserve the existing compact footer. No claim of live publication is made until your deployment is Ready.

## Reference for refund processing information

https://github.com/razorpay/markdown-docs/blob/master/payments/refunds/normal.md

The bank processing estimate is distinct from the owner's refund-approval/initiation period and is not a guaranteed credit time. No claim of a completed legal/compliance audit is made by adding these pages.
