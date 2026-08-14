# SU8L DEVs — Cloud Bot Service

Elite, cyber-glassmorphism SaaS platform for hosting game bots in the cloud.
Monorepo: **server** (API + PayPal/Discord integrations), **bot** (owner-only
promo minting), **web** (React frontend with EN/AR localization).

## Architecture

```
paypal/
├── server/   Express + SQLite (node:sqlite) REST API
│   └── src/
│       ├── config.ts          env config
│       ├── plans.ts           plan catalog + promo price constants
│       ├── db.ts              schema + transactional repository
│       ├── lib/auth.ts        JWT session cookies
│       ├── lib/paypal.ts      PayPal Orders v2 + webhook signature verify
│       ├── lib/ids.ts         order ids + SU8L-…-DEVs promo code generator
│       ├── services/orders.ts idempotent fulfillment (promo lock + activate)
│       ├── services/uptime.ts status monitor + 30-day history
│       └── routes/            auth, checkout, webhooks, dashboard, tickets,
│                              status, plans, bot
├── bot/      Discord.js bot — /su8l_promo (owner locked)
└── web/      React + Vite + Tailwind, i18n (en/ar), custom cyber theme
```

## Setup

```bash
npm install
cp server/.env.example server/.env   # fill credentials
cp bot/.env.example bot/.env
cp web/.env.example web/.env         # optional: VITE_PROVIDERS, VITE_API_URL
npm run dev
```

- API: http://localhost:4000 · Web: http://localhost:5173
- Production build: `npm run build` then `npm run start`.

### Critical flows

**Post-payment WhatsApp handoff.** Users are never asked for game account
credentials on the site. Checkout creates a PayPal Order; on capture (via
server-side capture AND/OR the verified `PAYMENT.CAPTURE.COMPLETED` webhook)
`fulfillOrder()` idempotently activates the order and emits the order id. The
Success screen only renders for `completed` orders and builds a `wa.me` deep
link pre-filled with:

```
Hello SU8L DEVs ⚡
I have successfully purchased the Cloud Bot Service.
■ Order ID: #<id>
■ Plan: <plan>
■ Discord User: <name>
I am ready to provide my game account details securely.
```

**Promo code locks.** `/su8l_promo` refuses any non-owner interaction and calls
the guarded API endpoint. Codes are minted as `SU8L-XXXX-XXXX-XXXX-DEVs`
(`unused` in DB). At checkout a valid unused code forces the **Elite** plan to
**$25/month**; the **$15 Extra Account Slot is never discounted**. On payment
success the code is flipped to `used` inside the same `BEGIN IMMEDIATE`
transaction that activates the subscription — SQLite's single-writer lock
serializes concurrent captures, so a code can never be consumed twice.

## Bot panel overrides

- Event/homeland tab renamed to **Island**.
- Connection Settings show **only** "Reconnect Delay (s)" and "Reconnect Delay
  after other-device login (s)". Auto-Start, Auto Reconnect and Action delay
  are removed.

## Cloud Configurator

The customer dashboard's **Cloud Configurator** (`/dashboard/bot`) is a
preferences panel with Island / Gathering / Connection tabs:

- **Edit lock** — strictly read-only until the user hits **Edit Configuration**.
- **Save Settings** compiles every preference into a clean summary and
  dispatches it to the owner's **Discord DM** via the bot, always including the
  buyer's **Discord Name + Discord ID** so the config maps to the right buyer.
- A confirmation modal confirms the save and notes modifications apply at the
  **next daily in-game reset**.

### Dispatch architecture

```
Web ──PUT /api/dashboard/cloud-config──▶ API (validate + persist)
API ──POST /dispatch (x-bot-key)───────▶ Bot (HTTP listener, :4001)
Bot ──DMs owner via Discord────────────▶ Owner DM (Discord name + ID included)

PayPal capture ─▶ fulfillOrder() ─▶ POST /dispatch {grant_role}
                                  ─▶ Bot adds PAID_ROLE_ID to the member
```

Env for dispatch: `BOT_CALLBACK_URL` (server), `BOT_PORT` + `PAID_ROLE_ID`
(bot). `GuildMembers` is a **privileged intent** — enable it in the Developer
Portal for role grants.

## PayPal webhook configuration

1. Create a webhook in the PayPal app pointing at
   `https://<api>/api/webhooks/paypal` for event `PAYMENT.CAPTURE.COMPLETED`.
2. Paste its Webhook ID into `PAYPAL_WEBHOOK_ID` (mandatory in production —
   inbound signatures are verified cryptographically).
3. Authorize the PayPal app for **Checkout API** (Orders v2).

## Testing

- `node scripts/smoke.mjs` — core logic (promo locks, fulfillment, config
  normalization, DM compilation).
- `node scripts/http_smoke.mjs` — full API over HTTP with a **mock bot
  listener** verifying the config DM + role-grant dispatch contracts.
- `node scripts/sandbox_e2e.mjs` — **real** PayPal Sandbox flow (runbook:
  `docs/paypal-sandbox-e2e.md`).
