# EVERSTAR — Memories Beyond Time

A clean successor to Nostalgia, preserving its central idea: memories represented as stars and time capsules that stay sealed until their chosen future date.

## Included in this first foundation

- Responsive celestial dashboard and navigation
- Memory constellation cards and timeline
- Create, search, filter, inspect, copy, and delete memories
- Future-dated time capsules with date-based locking in the preview
- Light/dark appearance toggle
- Browser-local preview persistence

## Run locally

```bash
npm install
npm run dev
```

## Production boundary

This is a frontend foundation, **not yet a multi-user production service**. Memories currently persist in the current browser using localStorage. Authentication, cross-device sync, encrypted server-side storage, secure media uploads, account recovery, and reliable scheduled push notifications still require a backend and deployment configuration. Do not store sensitive or irreplaceable memories in this preview.

Never commit `.env` files, private keys, JWT secrets, VAPID private keys, user exports, or push subscription data. Use `.env.example` only as a template.

## Architecture direction

- Frontend: React + Vite
- Backend: authenticated API with strict ownership checks
- Database: relational persistence with per-user access controls
- Media: private object storage and expiring signed URLs
- Time capsules: server-side unlock enforcement; never trust client-side dates
- Notifications: server scheduler plus opt-in Web Push
