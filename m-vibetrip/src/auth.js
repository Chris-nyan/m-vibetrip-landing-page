import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change-me-to-a-long-random-string') {
  console.warn('[auth] WARNING: JWT_SECRET is using the default value in production. Set a strong secret in .env.');
}

export function login(username, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return null;
  if (!bcrypt.compareSync(password, admin.pass_hash)) return null;
  const token = jwt.sign({ uid: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return { token, username: admin.username };
}

export function changePassword(username, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  const res = db.prepare('UPDATE admins SET pass_hash = ? WHERE username = ?').run(hash, username);
  return res.changes > 0;
}

// Express middleware: requires a valid Bearer token.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
