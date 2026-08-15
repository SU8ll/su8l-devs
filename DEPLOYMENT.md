# دليل نشر مشروع SU8L DEVs

المشروع مبنى على 3 أجزاء:

| الجزء | التقنية | الاستضافة المقترحة |
|---|---|---|
| `server/` | Express + TypeScript | Render (خطة Free) |
| `web/` | Vite + React | Vercel (خطة Free) |
| القاعدة | PostgreSQL | Supabase (خطة Free) |

التخزين الآن **PostgreSQL بالكامل** — لا يوجد أي SQLite. الجداول تُنشأ تلقائيًا عند أول تشغيل للسيرفر، فلا حاجة لأي migration يدوي.

---

## خطوة 1: ارفع المشروع إلى GitHub

`gh` عندك حاليًا غير مسجل دخوله (التوكن منتهي). سجّل دخولك أولًا:

```powershell
gh auth login
```

ثم أنشئ repo وادفع:

```powershell
git add -A
git commit -m "chore: migrate storage from SQLite to PostgreSQL"
gh repo create su8l-devs --public --source . --push
```

> ملاحظة: `render.yaml` و`web/vercel.json` جاهزان في المشروع، والمجلد فيه `git` أصلًا (فيها commit واحد).

---

## خطوة 2: أنشئ قاعدة Supabase

1. سجّل في https://supabase.com وأنشئ مشروعًا جديدًا.
2. من `Project Settings → Database → Connection string` انسخ `URI` (Direct connection).
3. قيمتها شكلها هكذا، أضف `sslmode=require` في نهايتها:

```
postgresql://postgres.<ref>:<password>@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

4. احتفظ بها — سنضعها في `DATABASE_URL` على Render.

---

## خطوة 3: انشر الـ API على Render

1. سجّل في https://render.com ثم `New → Web Service`، واربط repo.
2. الإعدادات:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. أضف المتغيرات (كلها من `server/.env.example`) بقيم الإنتاج:

| المتغير | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `APP_URL` | `https://su8ldevs.eu.cc` |
| `API_URL` | `https://<اسم-السيرفر>.onrender.com` |
| `JWT_SECRET` | نص عشوائي طويل (32+ حرف) |
| `DATABASE_URL` | رابط Supabase من خطوة 2 |
| `CORS_ORIGINS` | `https://su8ldevs.eu.cc` |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | من Discord Developer Portal |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | من Google Cloud Console (اختياري) |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | من Meta for Developers (اختياري) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | من PayPal Developer Dashboard |
| `PAYPAL_MODE` | `sandbox` (وغيّره لاحقًا إلى `live`) |
| `PAYPAL_WEBHOOK_ID` | من خطوة 6 |
| `OWNER_WHATSAPP` | رقم الواتس بدون `+` أو مسافات |
| `OWNER_DISCORD_ID` | ID حسابك في ديسكورد |
| `BOT_API_KEY` | سر مشترك بين API والبوت |
| `BOT_CALLBACK_URL` | رابط الـ bot (إن كان مشغّلًا) |
| `STAFF_DISCORD_IDS` | IDs فريق الدعم (اختياري) |
| `UPTIME_TARGET_URL` | `https://<اسم-السيرفر>.onrender.com/health` |
| `UPTIME_INTERVAL_MS` | `60000` |

> **بديل:** الملف `render.yaml` موجود — من Render استخدم `New → Blueprint` واربط repo فينشئ السيرفر والمتغيرات، بس لازم تعبي قيم المتغيرات يدويًا بعدها.

4. بعد أول Deploy، تأكد أن `GET https://<اسم-السيرفر>.onrender.com/health` يرجع `{"ok":true,...}`.

---

## خطوة 4: انشر الواجهة على Vercel

1. سجّل في https://vercel.com ثم `Add New → Project` واربط repo.
2. الإعدادات:
   - **Root Directory:** `web`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (موجود في `web/vercel.json`)
   - **Output Directory:** `dist`
3. أضف المتغيرات في `web`:
   - `VITE_API_URL` = `https://<اسم-السيرفر>.onrender.com`
   - `VITE_PROVIDERS` = `discord,google,facebook`
4. Deploy — ستحصل على رابط مثل `https://su8l-devs.vercel.app`.

---

## خطوة 5: الربط مع نطاقك su8ldevs.eu.cc

من لوحة Cloudflare، أضف سجلات:

| النوع | الاسم | القيمة |
|---|---|---|
| `CNAME` | `su8ldevs.eu.cc` | `cname.vercel-dns.com` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

من Vercel: `Project → Settings → Domains` أضف `su8ldevs.eu.cc` و `www.su8ldevs.eu.cc`، ويختبر الاتصال تلقائيًا.

---

## خطوة 6: سجلات OAuth + Webhook

سجّل هذه الـ redirect URIs (استبدل `<API_URL>` برابط الـ API على Render):

- **Discord:** `<API_URL>/api/auth/discord/callback`
- **Google:** `<API_URL>/api/auth/google/callback`
- **Facebook:** `<API_URL>/api/auth/facebook/callback`

**PayPal Webhook** (في PayPal Developer Dashboard ← App ← Webhooks):
- URL: `<API_URL>/api/webhooks/paypal`
- Events: اختر `Payment capture completed` و `Payment capture reversed` و `Payment capture denied`.
- انسخ **Webhook ID** وضعه في `PAYPAL_WEBHOOK_ID` ثم **redeploy**.
  - بدون Webhook ID السيرفر يقبل الويبهوك بدون تحقق (للاختبار فقط)، لكن للإنتاج حطّه.

---

## خطوة 7: التشغيل الفعلي (Go Live)

1. ضع `PAYPAL_MODE=live` وباستبدال `PAYPAL_CLIENT_ID/SECRET` بنسخة live من PayPal.
2. تأكد أن `CORS_ORIGINS` فيه `https://su8ldevs.eu.cc`.
3. Redeploy — واختبر الدخول بـ Discord وشراء منتج بحساب PayPal حقيقي صغير.
4. تأكد من ظهور التذاكر والداشبورد وSlots بعد الشراء.

---

## التطوير محليًا

تحتاج Postgres محليًا (لم يعد SQLite):

```powershell
docker run -d --name su8l-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

ثم شغّل السيرفر:

```powershell
# في مجلد server
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/su8l"
npm run dev        # على http://localhost:4000
```

والواجهة:

```powershell
# في مجلد web
npm run dev        # على http://localhost:5173 (يبروكسي /api تلقائيًا)
```

ملاحظة: اختبار `PAYPAL_WEBHOOK_ID` و`BOT_CALLBACK_URL` فارغين يعني أن الويبهوك والبوت مش فعالين محليًا إلا إذا عبيتهم.
