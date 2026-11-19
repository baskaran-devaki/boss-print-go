# Admin income analytics

Dashboard replaces the old last-200-orders revenue card with a separately authenticated report.

## Behaviour

- Today and this-month cards always refer to current India time, independently of the selected reporting period.
- Today paid orders and all-date ready-for-pickup count.
- Today, yesterday, this month, last month, or custom inclusive date range (up to 366 days).
- Selected-period print income, binding income, platform fees, gross collections and quantities.
- Daily collections chart/table for the selected period; a separate full-year monthly chart/table.
- Printwise table groups stored paper size and colour, excluding binding and platform fee to prevent double counting.
- PDF downloads directly with English labels and INR amounts, paginated daily/monthly figures and printwise breakdown. No browser print dialogue, new dependency or remote font is needed.
- Amounts are summed in integer paise from stored snapshots, without applying today's fee rate to historical orders.
- Only verified payments qualify. Razorpay rows additionally require their captured payment ID. Pending/failed/cancelled drafts are excluded.
- Figures use **order creation date in IST**, not the capture or bank settlement date: historical records do not have a dedicated verified-payment timestamp.
- Collections are gross before refunds, Razorpay deductions and business expenses. They are not net profit or bank settlement amounts. Refund reconciliation is not added by this patch.
- Financial rows remain reportable after uploaded files expire. No file links or customer details are read for analytics.
- Server independently checks admin role, reads each requested range in 500-row pages, and fails explicitly if any page fails. It does not reuse the operational 200-order limit.
- Refresh button and normal focus refresh update the data. Payment/status mutations invalidate the analytics cache.

## Apply

No SQL migration, environment variable, npm dependency or Android APK update is required.

```powershell
git apply --check "$HOME\Downloads\boss-printgo-admin-analytics.patch"
git apply "$HOME\Downloads\boss-printgo-admin-analytics.patch"
npm run build
npm test
```

```powershell
git add src/components/admin-analytics.tsx src/components/admin-orders.tsx src/routes/admin.tsx src/lib/analytics.ts src/lib/analytics.functions.ts src/lib/analytics-pdf.ts src/lib/analytics.test.ts src/lib/analytics.functions.test.ts docs/admin-income-analytics.md
git commit -m "Add admin income analytics and PDF reports"
git pull --no-rebase --no-edit origin main
```

If there are no merge conflicts, push with `git push origin main`. Wait for Vercel Ready, then reload Admin Dashboard.

## Review after deploy

1. Compare a known paid order with selected-day totals. Print + binding + fee must equal gross collections.
2. A cancelled Razorpay checkout must not affect the report.
3. Old manual verified orders keep their historical totals and zero fee where applicable.
4. Select a zero-order day, a month, and a custom range. Empty days must display zero.
5. Switch monthly-chart year independently; labels state it is separate from the date filter.
6. Download PDF, compare period/totals with dashboard, and check daily/monthly tables across pages.
7. Mark a ready paid order picked up; pending-pickup count must reduce on return/refresh.
8. Confirm existing customer, pricing, payment settings and Orders tabs still work.
