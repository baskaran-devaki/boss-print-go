# Service pricing
- [x] Persist pricing with admin-only writes and safe public rate reads.
- [x] Add service selection and precise bulk calculation to the customer dashboard.
- [x] Replace mock admin sign-in and add pricing CRUD.
- [x] Validate current pricing server-side before checkout; retain demo payment/order behavior.
- [x] Test pricing boundaries, access controls, and customer flow.

# Orders and UPI payments
- [x] Store orders with server-quoted totals, unique order IDs and private tracking tokens.
- [x] Private file storage with admin-only signed access.
- [x] Customer payment step: UPI ID, GPay number, exact-amount QR, UTR and optional screenshot.
- [x] Admin payment settings CRUD (UPI, GPay, QR image).
- [x] Admin order verification (payment stays pending until verified) and status updates.
- [x] Test pricing boundaries, access controls, and customer flow.

# Customer mobile experience
- [ ] Add private name/mobile/category entry and admin customer counts.
- [ ] Autofill order details and link orders to the customer session.
- [ ] Add Dashboard, Status and current-calendar-month History with India-time reset.
- [ ] Verify customer and admin flows on mobile and desktop.
