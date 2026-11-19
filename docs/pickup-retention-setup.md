# Files and customer history: 24 hours after pickup

Baseline: GitHub main 8a64d2a. No customer database or live deployment has been modified by this patch.

## Behaviour

The database stamps the FIRST time admin marks an order Picked up. At pickup + 24 elapsed hours, customer history/status/tracking no longer expose the order and admin cannot generate fresh file links. Existing links issued by this update are capped to the remaining retention window. The automated cleanup removes private documents and payment screenshots with the Supabase Storage API, then clears their references and stamps files_deleted_at. It retries failed Storage deletions without discarding references. Financial order/payment records are kept for admin income/accounting. No active/uncollected or cancelled unpaid checkout is deleted by this rule.

The first-pickup timestamp cannot be postponed by changing status, editing payments or running cleanup. Existing picked-up orders with no reliable timestamp start a fresh 24-hour grace period when the SQL migration is run. Exact logical expiry does not require a scheduler; physical removal normally occurs on the next minute's scheduled run. Service outages or a large backlog can delay physical removal until successful retries. This is not a guarantee of deletion from already downloaded files, printed copies or provider backups.

Contact details and public /contact and /privacy pages use the owner's supplied details. Login and customer footer link to them without adding another login footer row. Terms/refund pages are not added by this patch.

## Windows setup

1. Save boss-printgo-pickup-retention.patch in Downloads. From C:\Users\hi\StudioProjects\boss-print-go:

```powershell
git apply --check "$HOME\Downloads\boss-printgo-pickup-retention.patch"
# Continue only if no error:
git apply "$HOME\Downloads\boss-printgo-pickup-retention.patch"
npm run build
```

2. In your OWN Supabase project SQL Editor run drizzle/migrations/0011_pickup_file_retention.sql. Prior migrations 0009 and 0010 must already be applied. It does not immediately remove existing picked-up files; they get a 24-hour grace period.
3. Generate a new dedicated random secret locally, for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep the output private. Add it to Vercel Production as FILE_CLEANUP_SECRET (Secret). This is NOT a Razorpay secret and does not change payment integration.
4. In Supabase's Vault create exactly one secret named boss_file_cleanup_secret with the same value. Do not put the secret in GitHub or chat. The scheduler SQL reads it from Vault. Database administrators and database roles with access to the pg_net queue can see scheduled request headers; don't grant queue/Vault access to app users.
5. Commit and push the update files below normally; wait for Vercel Ready. If using a preview environment, configure a separate secret and scheduler URL for it; do not run the production cleanup against a test database by accident.

```powershell
git add .env.example AGENTS.md docs/pickup-retention-setup.md drizzle/migrations/0011_pickup_file_retention.sql supabase/setup/schedule-pickup-cleanup.sql src/lib/order-retention.ts src/lib/order-retention.test.ts src/lib/order-cleanup.server.ts src/lib/order-cleanup.test.ts src/lib/business.ts src/lib/customers.functions.ts src/lib/orders.functions.ts src/components/customer-orders.tsx src/components/customer-shell.tsx src/components/public-info.tsx src/routes/contact.tsx src/routes/privacy.tsx src/routes/api/cleanup-picked-up.ts src/routeTree.gen.ts src/styles.css
git commit -m "Expire pickup files and customer history after 24 hours"
git push origin main
```

6. Only AFTER deployment is Ready, run supabase/setup/schedule-pickup-cleanup.sql in Supabase SQL Editor. It enables pg_cron/pg_net and schedules the authenticated endpoint every minute. A browser visit or Vercel redeploy alone does not schedule deletion. This uses Supabase Cron instead of relying on a daily-only hosting cron plan.
7. Verify the job actually runs: `select id,status_code,error_msg,created from net._http_response order by created desc limit 10;`. Expect HTTP 200, usually `{"deleted":0,"failed":0}` until a pickup is due. A cron.job_run_details success alone only means the HTTP request was queued, not that files were deleted. HTTP 401 means the Vault/Vercel secrets differ; 503 means Vercel is missing the secret; 500 requires checking the migration, Storage API and retries. Do not call the automatic physical deletion feature active until the scheduled endpoint succeeds.

No new APK is required for this web/server-only update when the installed app uses the existing remote Vercel URL.

## Verification

- Local unit tests simulate the exact 24-hour boundary, timezone offsets, uncollected orders, storage failures, DB finalization failure and secret authentication.
- Use an actual small test order: mark Picked up and confirm the migration stamped picked_up_at. Before +24h it remains in the current-month history and the admin can open files. At +24h the customer record disappears, old tracking no longer resolves, and the next successful scheduled cleanup clears files. Admin order amount/payment still remains.
- Confirm an order still in received/printing/ready is not affected. Do not disable triggers or shorten production timestamps for a test: that would change the retention contract.
- Check /contact and /privacy without logging in. Customer history entries are derived from financial order rows; they are removed from customer visibility rather than deleting the financial ledger.

## Changed files

SQL migration, secured cleanup route/helper, Supabase scheduler setup, shared retention helper/tests, existing customer/admin read and file-link handlers, pickup retention notice, owner/contact data, public contact/privacy pages/links, generated route tree, compact footer CSS and .env.example documentation. Files are removed through the Storage API; SQL must never directly delete storage.objects metadata.

References:
- https://supabase.com/docs/guides/storage/management/delete-objects
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/cron
