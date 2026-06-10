// Lightweight validation helpers — no external dependency.

export function str(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}

export function isEmail(v) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

// Validate a lead submission. Returns { ok, error, data }.
export function validateLead(body, type) {
  const name = str(body.name, 120);
  const email = str(body.email, 160);
  const whatsapp = str(body.whatsapp, 60);

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!email && !whatsapp)
    return { ok: false, error: 'Please provide an email or WhatsApp number so we can reply.' };
  if (email && !isEmail(email)) return { ok: false, error: 'That email address looks invalid.' };

  // Everything else is captured into details as-is (trimmed), minus core fields.
  const details = {};
  for (const [k, v] of Object.entries(body)) {
    if (['name', 'email', 'whatsapp', 'notes', 'subject'].includes(k)) continue;
    details[k] = str(v, 1000);
  }

  return {
    ok: true,
    data: {
      type,
      name,
      email,
      whatsapp,
      subject: str(body.subject, 200),
      details: JSON.stringify(details),
      notes: str(body.notes, 2000),
    },
  };
}
