import nodemailer from 'nodemailer';

let transporter = null;
const enabled = Boolean(process.env.SMTP_HOST);

if (enabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  console.log('[mailer] SMTP configured — lead notifications enabled.');
} else {
  console.log('[mailer] No SMTP_HOST set — email notifications disabled (leads still saved).');
}

const LABELS = {
  festival: '🎪 New Festival Ticket Booking',
  package: '✈️ New Package Quote Request',
  contact: '✉️ New Contact Message',
};

export async function notifyLead(lead) {
  if (!enabled) return;
  const to = process.env.NOTIFY_TO || process.env.CONTACT_EMAIL;
  if (!to) return;

  let details = {};
  try { details = JSON.parse(lead.details || '{}'); } catch { /* ignore */ }

  const rows = Object.entries(details)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 10px;color:#666">${k}</td><td style="padding:4px 10px"><strong>${v}</strong></td></tr>`)
    .join('');

  const html = `
    <h2>${LABELS[lead.type] || 'New Lead'}</h2>
    <p><strong>${lead.subject || ''}</strong></p>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
      <tr><td style="padding:4px 10px;color:#666">Name</td><td style="padding:4px 10px"><strong>${lead.name || ''}</strong></td></tr>
      <tr><td style="padding:4px 10px;color:#666">Email</td><td style="padding:4px 10px"><strong>${lead.email || '—'}</strong></td></tr>
      <tr><td style="padding:4px 10px;color:#666">WhatsApp</td><td style="padding:4px 10px"><strong>${lead.whatsapp || '—'}</strong></td></tr>
      ${rows}
      ${lead.notes ? `<tr><td style="padding:4px 10px;color:#666">Notes</td><td style="padding:4px 10px">${lead.notes}</td></tr>` : ''}
    </table>
    <p style="color:#999;font-size:12px">Received ${new Date().toISOString()}</p>`;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'M-VibeTrip <no-reply@m-vibetrip.com>',
      to,
      replyTo: lead.email || undefined,
      subject: `${LABELS[lead.type] || 'New Lead'} — ${lead.name || ''}`,
      html,
    });
  } catch (err) {
    console.error('[mailer] Failed to send notification:', err.message);
  }
}
