# EVERSTAR delivery plan

## Implemented in the repository
- [x] Account registration and email/password sign-in through Supabase Auth.
- [x] Password reset email flow and password update screen.
- [x] Persistent per-user memory records in Postgres.
- [x] Server-side AES-256-GCM encryption for memory payloads.
- [x] Server-side owner checks and unlock-time enforcement before decryption.
- [x] Private attachment bucket and short-lived signed downloads after unlock.
- [x] Scheduled in-app notifications for capsules whose unlock time has arrived.
- [x] Responsive memory, capsule, timeline, and notification screens.

## Still required before first real use
- [ ] Create and select a dedicated Supabase project for EVERSTAR.
- [ ] Apply both SQL migrations and confirm the scheduled job is active.
- [ ] Configure server-only encryption key and allowed app origin.
- [ ] Deploy Edge Functions and configure Auth redirect URLs.
- [ ] Configure production SMTP and test email confirmation/password recovery.
- [ ] Run end-to-end tests for two users, ownership isolation, locked API reads, attachment access and deletion.
- [ ] Run Supabase security/performance advisors and fix all relevant findings.
- [ ] Build and deploy the site; configure HTTPS and the final site URL.
- [ ] Optional Web Push notifications for users who are not currently signed in.

## Launch gate
Do not enter irreplaceable or sensitive memories until the live backend is connected, the encryption key has been safely backed up, all unlock/ownership tests pass, and the production deployment has been verified.
