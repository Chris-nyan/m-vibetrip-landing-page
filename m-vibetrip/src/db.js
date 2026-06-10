import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ARTICLES, FESTIVALS, SERVICES, PACKAGES } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(ROOT, process.env.DB_PATH)
  : path.resolve(ROOT, 'data', 'mvibetrip.db');

// Ensure the data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS articles (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    cat     TEXT NOT NULL,
    title   TEXT NOT NULL,
    exc     TEXT,
    body    TEXT,
    img     TEXT,
    date    TEXT,
    rt      TEXT,
    status  TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS festivals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    dates      TEXT,
    venue      TEXT,
    price_from INTEGER,
    status     TEXT NOT NULL DEFAULT 'live',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    desc     TEXT,
    features TEXT,
    img      TEXT,
    status   TEXT NOT NULL DEFAULT 'live',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    category   TEXT,
    price_from INTEGER,
    group_size TEXT,
    desc       TEXT,
    inclusions TEXT,
    status     TEXT NOT NULL DEFAULT 'live',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Unified leads table: festival bookings, package quotes, contact messages
  CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,            -- 'festival' | 'package' | 'contact'
    name        TEXT,
    email       TEXT,
    whatsapp    TEXT,
    subject     TEXT,                     -- festival name / package name / contact subject
    details     TEXT,                     -- JSON blob of all submitted fields
    notes       TEXT,
    status      TEXT NOT NULL DEFAULT 'new', -- new | contacted | won | lost
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_type    ON leads(type);
  CREATE INDEX IF NOT EXISTS idx_articles_cat  ON articles(cat);
`);

// ── First-run seeding ───────────────────────────────────────────
function seedIfEmpty() {
  const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'mvibe2026';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, pass_hash) VALUES (?, ?)').run(username, hash);
    console.log(`[db] Seeded admin user "${username}".`);
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM articles').get().n === 0) {
    const ins = db.prepare(
      'INSERT INTO articles (cat,title,exc,body,img,date,rt) VALUES (@cat,@title,@exc,@body,@img,@date,@rt)'
    );
    const tx = db.transaction((rows) => rows.forEach((r) => ins.run(r)));
    tx(ARTICLES);
    console.log(`[db] Seeded ${ARTICLES.length} articles.`);
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM festivals').get().n === 0) {
    const ins = db.prepare(
      'INSERT INTO festivals (name,dates,venue,price_from,status) VALUES (@name,@dates,@venue,@price_from,@status)'
    );
    db.transaction((rows) => rows.forEach((r) => ins.run(r)))(FESTIVALS);
    console.log(`[db] Seeded ${FESTIVALS.length} festivals.`);
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM services').get().n === 0) {
    const ins = db.prepare(
      'INSERT INTO services (name,desc,features,img) VALUES (@name,@desc,@features,@img)'
    );
    db.transaction((rows) => rows.forEach((r) => ins.run(r)))(SERVICES);
    console.log(`[db] Seeded ${SERVICES.length} services.`);
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM packages').get().n === 0) {
    const ins = db.prepare(
      'INSERT INTO packages (name,category,price_from,group_size,desc,inclusions) VALUES (@name,@category,@price_from,@group_size,@desc,@inclusions)'
    );
    db.transaction((rows) => rows.forEach((r) => ins.run(r)))(PACKAGES);
    console.log(`[db] Seeded ${PACKAGES.length} packages.`);
  }
}

seedIfEmpty();

export default db;
export { DB_PATH };
