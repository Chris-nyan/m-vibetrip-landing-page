import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Articles (published only), newest first; optional ?cat= filter.
router.get('/articles', (req, res) => {
  const cat = req.query.cat;
  const rows = cat && cat !== 'all'
    ? db.prepare("SELECT * FROM articles WHERE status='published' AND cat=? ORDER BY id DESC").all(cat)
    : db.prepare("SELECT * FROM articles WHERE status='published' ORDER BY id DESC").all();
  res.json(rows);
});

router.get('/articles/:id', (req, res) => {
  const row = db.prepare("SELECT * FROM articles WHERE id=? AND status='published'").get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  res.json(row);
});

router.get('/festivals', (_req, res) => {
  res.json(db.prepare("SELECT * FROM festivals ORDER BY id ASC").all());
});

router.get('/services', (_req, res) => {
  res.json(db.prepare("SELECT * FROM services WHERE status='live' ORDER BY id ASC").all());
});

router.get('/packages', (_req, res) => {
  res.json(db.prepare("SELECT * FROM packages WHERE status='live' ORDER BY id ASC").all());
});

export default router;
