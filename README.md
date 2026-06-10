# M-VibeTrip — Full-Stack Travel & Festival Booking Platform

Premium travel and festival experiences in Thailand by **Mingalar Paradise Travels** (TAT-licensed).
This repository contains the complete, production-ready full-stack application: a polished marketing
site, a real booking/quote/contact pipeline, and an authenticated admin CMS — all in one deployable
Node.js service.

---

## What's inside

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla HTML/CSS/JS (single page) | Served statically; enhanced with `public/js/api.js` |
| Backend | Node.js + Express | REST API, JWT admin auth, rate limiting, Helmet |
| Database | SQLite (`better-sqlite3`) | Zero external services; file-based, auto-seeded on first run |
| Email | Nodemailer (optional) | Lead notifications; gracefully disabled if no SMTP config |
| Deploy | Docker / Render blueprint | Plus GitHub Actions CI |

### Key features
- **Real bookings** — festival ticket bookings, package quote requests, and contact messages are
  validated, saved to the database, and (optionally) emailed to your team. The site keeps its
  embedded content as an **offline fallback**, which suits low-connectivity contexts.
- **Authenticated admin CMS** — the existing in-page admin panel now logs in against the server
  (bcrypt + JWT) instead of a hardcoded password, and gains a live **Leads** view of every enquiry.
- **Database-driven content** — articles, festivals, services and packages load from the API and
  are fully manageable from the admin panel.

---

## Quick start (local)

Requirements: **Node.js 18.17+**.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    then edit .env — at minimum set a strong JWT_SECRET and ADMIN_PASSWORD

# 3. Run
npm start
```

Open <http://localhost:8080>. The database is created and seeded automatically on first boot.

To open the admin panel: scroll to the footer → **Admin** link → log in with the
`ADMIN_USERNAME` / `ADMIN_PASSWORD` from your `.env`.

> **Generate a strong JWT secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## Environment variables

See [`.env.example`](./.env.example) for the full, commented list. The essentials:

| Variable | Purpose |
|----------|---------|
| `PORT` | Port to listen on (default `8080`) |
| `JWT_SECRET` | **Required in production.** Signs admin sessions |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeds the first admin on initial DB creation |
| `DB_PATH` | SQLite file location |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_TO` | Optional lead-notification email |
| `WHATSAPP_NUMBER`, `CONTACT_EMAIL`, `PHONE_TH`, `PHONE_MM` | Business contact details |
| `CORS_ORIGIN` | Allowed origins (default `*`) |

Email is **optional** — leave `SMTP_HOST` blank and leads still save to the database.

---

## API reference

### Public
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/config` | Business contact details |
| `GET` | `/api/content/articles` | Published articles (`?cat=` to filter) |
| `GET` | `/api/content/articles/:id` | Single article |
| `GET` | `/api/content/festivals` | Festivals |
| `GET` | `/api/content/services` | Services |
| `GET` | `/api/content/packages` | Packages |
| `POST` | `/api/bookings/festival` | Festival ticket booking |
| `POST` | `/api/bookings/package` | Package quote request |
| `POST` | `/api/bookings/contact` | Contact message |

### Admin (require `Authorization: Bearer <token>`)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Returns a JWT |
| `GET` | `/api/admin/stats` | Dashboard counts |
| `GET` | `/api/admin/leads` | All enquiries (`?type=` to filter) |
| `PATCH` | `/api/admin/leads/:id` | Update lead status |
| `DELETE` | `/api/admin/leads/:id` | Delete a lead |
| `GET/POST/PUT/DELETE` | `/api/admin/articles` (and `/festivals`, `/services`, `/packages`) | Content CRUD |
| `POST` | `/api/admin/change-password` | Update admin password |

---

## Deployment

### Option A — Render.com (one click)
This repo includes [`render.yaml`](./render.yaml). In Render: **New → Blueprint**, point it at your repo.
It provisions a web service with a **1 GB persistent disk** for the SQLite database (Singapore region,
closest to Thailand/Myanmar). Set `ADMIN_PASSWORD`, `SMTP_*`, and `NOTIFY_TO` in the dashboard.

### Option B — Docker (any VPS)
```bash
docker build -t m-vibetrip .
docker run -d -p 8080:8080 \
  -e JWT_SECRET="$(openssl rand -hex 48)" \
  -e ADMIN_PASSWORD="your-strong-password" \
  -v $(pwd)/data:/app/data \
  m-vibetrip
```

### Option C — Railway / Fly.io / Heroku
Standard Node app: build `npm install`, start `node src/server.js`. Attach a persistent volume
mounted where `DB_PATH` points so the database survives restarts.

---

## Project structure

```
m-vibetrip/
├── src/
│   ├── server.js          Express app: security, static hosting, API mounting
│   ├── db.js              SQLite schema + first-run seeding
│   ├── seed-data.js       Initial articles / festivals / services / packages
│   ├── auth.js            JWT + bcrypt, requireAdmin middleware
│   ├── validate.js        Input validation & sanitization
│   ├── mailer.js          Optional SMTP lead notifications
│   └── routes/
│       ├── bookings.js    Festival / package / contact submissions
│       ├── content.js     Public content endpoints
│       └── admin.js       Login, stats, leads, content CRUD
├── public/
│   ├── index.html         The marketing site (your existing design)
│   └── js/api.js          Wires the site to the API (overrides demo handlers)
├── data/                  SQLite DB lives here at runtime (gitignored)
├── scripts/init-db.js     `npm run seed`
├── Dockerfile, render.yaml, .github/workflows/ci.yml
└── .env.example
```

---

## Security notes
- Change `ADMIN_PASSWORD` and set a unique `JWT_SECRET` before going live.
- The admin password is stored as a **bcrypt hash**; it is never kept in plaintext.
- Write/auth endpoints are **rate limited** (60 requests / 15 min per IP).
- `helmet`, `compression`, and `cors` are enabled. The Content-Security-Policy is left permissive so
  the existing CDN fonts/images/video keep working — tighten it to your asset list when ready.

## License
MIT — see [LICENSE](./LICENSE).
