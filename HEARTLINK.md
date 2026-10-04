# HeartLink — Meet. Match. Connect.

Full-stack dating app (TanStack Start + React + Postgres) with real auth, database, OPay-style wallet, AI companions, and mobile-first UI.

## Stack

- **Frontend:** React 19, TanStack Router/Query, Tailwind v4
- **Backend:** TanStack Start server functions + Better Auth
- **Database:** Neon Postgres (production) / PGLite (preview)
- **AI:** xAI Grok API for companions + reply suggestions (when `XAI_API_KEY` is set)
- **Payments:** OPay checkout simulation (credits HeartCoins / Premium / Boosts)

## Features

### Auth
- Google & X (Grok broker)
- Email + password
- Per-user data always scoped by `authMiddleware`

### Discovery & matching
- Swipe deck with seeded profiles
- Like / Super Like / Pass / Undo / Boost
- Mutual match engine (seed/AI auto-match for demo)

### Chat
- Match messaging
- Labeled **AI companions** (Aria, Nova, Romeo)
- AI reply suggestions

### Safety
- Block, report, unmatch
- 18+ onboarding

### OPay wallet
- HeartCoins balance
- Packs: coins, Premium 7 days, Boost 30 min
- Purchase history
- Super Like = 5 coins · Boost = 15 coins

## Database tables (`migrations/0002_heartlink.sql`)

| Table | Purpose |
|-------|---------|
| `hl_profiles` | User + seed + AI profiles |
| `hl_likes` / `hl_passes` | Swipes |
| `hl_matches` / `hl_messages` | Matches & chat |
| `hl_blocks` / `hl_reports` | Safety |
| `hl_wallets` / `hl_purchases` | OPay economy |

Auth tables: `migrations/0001_auth.sql` (Better Auth).

## Backend API (`src/lib/heartlink/fns.ts`)

| Function | Role |
|----------|------|
| `getMyProfile` / `saveMyProfile` | Profile CRUD |
| `getDiscover` | Discovery deck |
| `likeProfile` / `passProfile` / `undoPass` | Swipes |
| `listMatches` / `openAiCompanions` | Matches |
| `getChat` / `sendMessage` / `suggestReply` | Messaging |
| `unmatch` / `blockUser` / `reportUser` | Safety |
| `getWallet` / `opayCheckout` / `listPurchases` / `spendBoost` | OPay |
| `whoLikedMe` | Premium feature |
| `deleteMyAccount` | Account wipe |

## Screens

- `/` Welcome
- `/login` Sign in / Sign up
- `/onboarding` Profile setup
- `/app` Discover
- `/app/matches` Matches
- `/app/messages` Chats list
- `/app/chat/$peerId` Chat
- `/app/wallet` OPay wallet
- `/app/profile` You

## Run locally

```bash
npm install
npm run dev
```

App listens on `0.0.0.0:8080`.

```bash
npm run typecheck
npm run build
```

## Deploy notes

- Set `deploy.database: true` in `.grok/app-env.json` (already set)
- Platform injects `DATABASE_URL` + auth creds
- Optional: `XAI_API_KEY` for live AI replies
- Wire real OPay merchant API keys into `opayCheckout` for production payments

## Prototype (Phase 1)

A single-file HTML prototype also lives under `artifacts/HeartLinkApp/` for offline demos.

---

**HeartLink v1.0 — backend complete**
