import { Router } from 'express';
import db from '../db.js';
import { login, changePassword, requireAdmin } from '../auth.js';
import { str } from '../validate.js';

const router = Router();

// ── Login (public) ──────────────────────────────────────────────
router.post('/login', (req, res) => {
  const username = str(req.body?.username, 120);
  const password = str(req.body?.password, 200);
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: 'Incorrect username or password.' });
  res.json(result);
});

// Everything below requires a valid admin token.
router.use(requireAdmin);

// ── Dashboard stats ─────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  res.json({
    articles: count('articles'),
    festivals: count('festivals'),
    services: count('services'),
    packages: count('packages'),
    leads: count('leads'),
    new_leads: db.prepare("SELECT COUNT(*) AS n FROM leads WHERE status='new'").get().n,
  });
});

// ── Leads ───────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const type = req.query.type;
  const rows = type
    ? db.prepare('SELECT * FROM leads WHERE type=? ORDER BY id DESC').all(type)
    : db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  res.json(rows.map((r) => ({ ...r, details: safeParse(r.details) })));
});

router.patch('/leads/:id', (req, res) => {
  const status = str(req.body?.status, 20);
  const res2 = db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: res2.changes > 0 });
});

router.delete('/leads/:id', (req, res) => {
  const r = db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ ok: r.changes > 0 });
});

// ── Generic CRUD factory ────────────────────────────────────────
function crud(table, fields) {
  const cols = fields.join(',');
  const placeholders = fields.map((f) => '@' + f).join(',');
  const setClause = fields.map((f) => `${f}=@${f}`).join(',');

  const insert = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`);
  const update = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id=@id`);
  const del = db.prepare(`DELETE FROM ${table} WHERE id=?`);

  router.get(`/${table}`, (_req, res) => {
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all());
  });

  router.post(`/${table}`, (req, res) => {
    const row = {};
    for (const f of fields) row[f] = req.body?.[f] ?? null;
    const info = insert.run(row);
    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put(`/${table}/:id`, (req, res) => {
    const row = { id: req.params.id };
    for (const f of fields) row[f] = req.body?.[f] ?? null;
    const info = update.run(row);
    res.json({ ok: info.changes > 0 });
  });

  router.delete(`/${table}/:id`, (req, res) => {
    res.json({ ok: del.run(req.params.id).changes > 0 });
  });
}

crud('articles', ['cat', 'title', 'exc', 'body', 'img', 'date', 'rt', 'status']);
crud('festivals', ['name', 'dates', 'venue', 'price_from', 'status']);
crud('services', ['name', 'desc', 'features', 'img', 'status']);
crud('packages', ['name', 'category', 'price_from', 'group_size', 'desc', 'inclusions', 'status']);

// ── Account ─────────────────────────────────────────────────────
router.post('/change-password', (req, res) => {
  const next = str(req.body?.password, 200);
  if (next.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const ok = changePassword(req.admin.username, next);
  res.json({ ok });
});

function safeParse(v) {
  try { return JSON.parse(v); } catch { return {}; }
}

export default router;
