# EVERSTAR product roadmap

## Phase 1 — Experience foundation (committed)
- Responsive celestial shell and dashboard
- Memory creation, browsing, search and filtering
- Timeline and future-dated capsule preview
- Browser-local preview storage

## Phase 2 — Real accounts and persistence
- Account registration, login, logout and recovery
- Server-side session handling and ownership checks
- Database migrations and per-user row-level access controls
- Encrypted-at-rest memory content and key management design
- Cross-device sync and data export/delete

## Phase 3 — Time capsule integrity
- Enforce unlock timestamps on the server, not only in the browser
- Time-zone-aware scheduling and daylight-saving handling
- Background scheduler with retry/idempotency
- Audit events for capsule opening and delivery

## Phase 4 — Media and notifications
- Private image/file storage with expiring signed URLs
- Optional browser push with explicit permission and subscription management
- Email notifications and delivery preferences

## Phase 5 — Quality and launch
- Unit, integration and end-to-end tests
- Accessibility and reduced-motion support
- Arabic/English localization and RTL review
- Rate limiting, security headers, monitoring and backups
- Production deployment after secrets and hosting are configured

## Non-negotiable rules
- Never trust client-side unlock checks as authorization.
- Never commit secrets, user exports, or push subscriptions.
- Never silently delete or migrate original Nostalgia data.
- Treat this frontend preview as non-production until Phase 2 and Phase 3 are complete.
