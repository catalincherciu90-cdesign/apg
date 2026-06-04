# APG Garage — Cloudflare Workers

Aplicație de management service auto (programări, devize, tractări, dezmembrări,
panou admin), rescrisă din PHP+MySQL în **Cloudflare Workers + D1 + Hono**.

Codul PHP original este păstrat pentru referință în `legacy/`.

## Stack

- **Runtime:** Cloudflare Workers (TypeScript)
- **Routing/HTML:** [Hono](https://hono.dev)
- **Bază de date:** Cloudflare D1 (SQLite)
- **Sesiuni:** cookie semnat HMAC (`SESSION_SECRET`)
- **Parole:** bcrypt (`bcryptjs`) — compatibil cu hash-urile `$2y$` din PHP
- **Email:** [Resend](https://resend.com) (API HTTP; Workers nu pot face SMTP brut)
- **Statice:** Workers Assets din `public/` (css, iconițe, manifest, sw.js)
- **Cron:** Cron Trigger zilnic — remindere revizie

## Structură

```
src/
  index.ts            # entry Worker (fetch + scheduled)
  types.ts            # tipuri Env / sesiune
  lib/                # db helpers, auth, sesiuni, parole, mailer, format, setări
  views/layout.ts     # shell HTML + nav public/admin
  routes/             # public, auth, client (dashboard/mașini/rezervare/deviz)
  routes/admin/       # programări, deviz, servicii/prețuri, tractări, dezmembrări, general
  data/catalog.ts     # catalog piese/manoperă pentru deviz
migrations/           # 0001_init.sql (schema), 0002_seed.sql (admin + setări)
public/               # asset-uri statice
legacy/               # codul PHP original (referință)
```

## Setup

```bash
npm install

# Creează baza D1 și pune database_id în wrangler.toml
npx wrangler d1 create apg-garage

# Migrează schema + seed (local apoi remote)
npm run db:migrate:local && npm run db:seed:local
npm run db:migrate     && npm run db:seed

# Secrete
npx wrangler secret put SESSION_SECRET   # orice șir aleator lung
npx wrangler secret put RESEND_API_KEY   # cheia API Resend

# Dezvoltare locală
npm run dev

# Deploy
npm run deploy
```

> Cont admin implicit: `admin@apg-garage.ro` / `password` — **schimbă parola** imediat
> din panoul de admin (Angajați → Resetează parola).

## Deploy (Cloudflare Workers Builds)

Repoul este conectat la Cloudflare prin **Workers Builds**, care rulează
`wrangler deploy` automat la fiecare push. Build-ul va eșua până când sunt
făcuți pașii de pregătire unică de mai jos (binding D1 + secrete).

**Pregătire unică:**

1. **Creează baza D1** și pune `database_id` în `wrangler.toml`, apoi commit:
   ```bash
   npx wrangler d1 create apg-garage
   # copiază "database_id" afișat în [[d1_databases]] din wrangler.toml
   ```
2. **Aplică schema** (o singură dată; ulterior migrațiile noi se aplică manual
   sau printr-un pas de build):
   ```bash
   npm run db:migrate   # wrangler d1 migrations apply apg-garage --remote
   ```
3. **Setează secretele** în dashboard-ul Cloudflare → Worker-ul → *Settings →
   Variables and Secrets*:
   - `SESSION_SECRET` — șir aleator lung pentru semnarea sesiunilor
   - `RESEND_API_KEY` — cheia API Resend

După acești pași, fiecare push declanșează un deploy reușit prin Workers Builds.

> Build-ul Cloudflare rulează doar `wrangler deploy`; nu aplică migrații D1.
> Rulează `npm run db:migrate` local când adaugi migrații noi.

## Variabile (wrangler.toml `[vars]`)

`SITE_NAME`, `BASE_URL`, `MAIL_FROM`, `MAIL_ADMIN`. Pentru Resend, domeniul din
`MAIL_FROM` trebuie verificat în contul Resend.
