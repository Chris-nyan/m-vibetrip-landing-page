import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bookingsRouter from './routes/bookings.js';
import contentRouter from './routes/content.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

const app = express();
app.set('trust proxy', 1);

// ── Security & parsing ──────────────────────────────────────────
app.use(
  helmet({
    // The frontend pulls fonts/images from CDNs and embeds video; relax CSP
    // so the existing markup keeps working. Tighten per your asset list later.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()) }));

// Rate limit write/auth endpoints to deter abuse.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down and try again shortly.' },
});

// ── Public runtime config (lets the frontend read business details) ──
app.get('/api/config', (_req, res) => {
  res.json({
    whatsapp: process.env.WHATSAPP_NUMBER || '66980791316',
    email: process.env.CONTACT_EMAIL || 'info@m-vibetrip.com',
    phone_th: process.env.PHONE_TH || '+66 980 791 316',
    phone_mm: process.env.PHONE_MM || '+95 925 041 1531',
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── API routes ──────────────────────────────────────────────────
app.use('/api/bookings', writeLimiter, bookingsRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin', writeLimiter, adminRouter);

// ── Static frontend ─────────────────────────────────────────────
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

// SPA-style fallback to index.html for non-API GET routes.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

// ── Error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`\n  M-VibeTrip running → http://localhost:${PORT}`);
  console.log(`  Admin panel        → http://localhost:${PORT}/ (footer “Admin” link)`);
  console.log(`  Health             → http://localhost:${PORT}/api/health\n`);
});
