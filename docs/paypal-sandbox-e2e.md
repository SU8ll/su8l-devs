# PayPal Sandbox End-to-End Runbook

This runbook walks you through the **real** PayPal Sandbox test of the complete
checkout → fulfillment chain: promo minting, real order creation, buyer
approval, server-side capture / webhook fulfillment, subscription activation,
and promo single-use enforcement.

> Status: **runbook only** — execute it whenever you have sandbox credentials.
> The Cloud Configurator and Discord wiring are code-complete and verified with
> a mocked bot listener (see the test suites at the end).

---

## Prerequisites

| # | Requirement | How |
|---|-------------|-----|
| 1 | PayPal Sandbox app | https://developer.paypal.com → Apps & Credentials → Sandbox app with **Orders v2 (Checkout API)** authorized |
| 2 | Client ID + Secret | Paste into `server/.env`: `PAYPAL_CLIENT_ID=…`, `PAYPAL_CLIENT_SECRET=…` |
| 3 | Sandbox buyer account | developer.paypal.com → Testing Tools → Sandbox Accounts → a **Personal** account (you'll log in as this to approve) |
| 4 | (Optional) Webhook ID | Create a webhook in the PayPal app → URL `https://<your-public-api>/api/webhooks/paypal`, event `PAYPAL_CAPTURE_COMPLETED` → paste ID into `server/.env` as `PAYPAL_WEBHOOK_ID`. Signature verification becomes mandatory when set. |
| 5 | Running server | `npm run build && npm run start -w @su8l/server` (confirms `(sandbox mode)`) |
| 6 | Web app reachable | `npm run dev -w @su8l/web` at `APP_URL` (localhost is fine) |
| 7 | `JWT_SECRET` | Must be a real secret (not the example value) |

Make sure `server/.env` has a real `BOT_API_KEY` too — the sandbox test mints a
promo through the guarded `/api/bot/promo` endpoint.

---

## Running the test

```bash
npm run build -w @su8l/server
node scripts/sandbox_e2e.mjs
```

The script:

1. Checks the API is up.
2. Creates a throwaway sandbox user + session.
3. Mints a fresh promo code via `/api/bot/promo`.
4. Calls the real PayPal Orders v2 API through `/api/checkout/create`
   (Elite plan + promo → expects **$25**).
5. Prints the **approval URL**. Open it in a browser, sign in with your
   **Sandbox Personal** account, and click **Approve**.
6. Polls until the order is `completed` — fulfilled either by the server-side
   capture on redirect (`/checkout/return` → `/api/checkout/capture`) or by the
   webhook.
7. Verifies: subscription active, 6 slots, promo consumed, promo reuse rejected.

### What a green run looks like

```
PASS  API reachable
PASS  promo minted via /api/bot/promo (SU8L-XXXX-XXXX-XXXX-DEVs)
PASS  PayPal sandbox order created (Elite + promo)
PASS  promo forced price to $25
PASS  order reached completed status
PASS  success payload shows Elite + $25
PASS  success payload carries buyer Discord identity
PASS  success payload includes owner WhatsApp
PASS  dashboard shows active Elite subscription
PASS  effective slots = 6
PASS  extra slot is purchasable now
PASS  promo consumed after capture
PASS  reusing consumed promo is rejected
13/13 passed
```

---

## Verifying the Discord side (optional, live)

The Cloud Configurator and role wiring are code-complete; the automated suites
verify them against a **mock bot listener**. To verify live:

1. Start the bot: `npm run dev -w @su8l/bot` with `DISCORD_BOT_TOKEN`,
   `OWNER_DISCORD_ID`, `GUILD_IDS`, `PAID_ROLE_ID`, and `BOT_API_KEY` set, and
   `BOT_CALLBACK_URL=http://localhost:4001` in `server/.env`.
2. In the customer dashboard → **Cloud Configurator** → **Edit Configuration**
   → tweak a field → **Save Settings**.
3. Check your DM: the compiled summary should arrive with the buyer's Discord
   name + ID and the note about the next daily in-game reset.
4. Make a (sandbox) purchase as a user whose Discord is in the guild — the bot
   should assign `PAID_ROLE_ID` to that member.

> Note: `GuildMembers` is a privileged intent — enable it in the Discord
> Developer Portal before expecting role grants to work.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `failed to create payment with PayPal` (502) | Wrong/expired Client ID+Secret, or the app lacks Orders v2 scope. |
| Webhook ignored (order stuck `created`) | Server not publicly reachable, or `PAYPAL_WEBHOOK_ID` mismatched. Use `/api/checkout/capture` fallback (the `/checkout/return` redirect does this automatically). |
| `invalid webhook signature` | Bad webhook ID, clock skew, or missing `PAYPAL_WEBHOOK_ID`. Verify the URL + event exactly. |
| Browser can't reach return URL | `APP_URL` must be reachable from the sandbox buyer's browser session. |
| Test re-runs fail | The script cleans up its own user/orders each run — wipe `data/su8l.db` if promo/state piles up. |
