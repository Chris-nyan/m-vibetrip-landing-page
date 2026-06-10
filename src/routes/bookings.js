import { Router } from 'express';
import db from '../db.js';
import { validateLead } from '../validate.js';
import { notifyLead } from '../mailer.js';

const router = Router();

const insertLead = db.prepare(`
  INSERT INTO leads (type, name, email, whatsapp, subject, details, notes)
  VALUES (@type, @name, @email, @whatsapp, @subject, @details, @notes)
`);

function handle(type) {
  return async (req, res) => {
    const result = validateLead(req.body || {}, type);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const info = insertLead.run(result.data);
    const lead = { id: info.lastInsertRowid, ...result.data };

    // Fire-and-forget email; never block the response on it.
    notifyLead(lead).catch(() => {});

    const messages = {
      festival: "Booking request received! We'll confirm via WhatsApp or email within 2 hours.",
      package: "Quote request received! We'll send your personalised quote within 4 hours.",
      contact: "Thanks for reaching out — we'll be in touch shortly.",
    };

    res.status(201).json({ ok: true, id: lead.id, message: messages[type] });
  };
}

router.post('/festival', handle('festival'));
router.post('/package', handle('package'));
router.post('/contact', handle('contact'));

export default router;
