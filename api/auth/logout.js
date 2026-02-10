import { clearSessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }
  clearSessionCookie(res);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({ ok: true }));
}
