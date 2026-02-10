import { isAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }
  res.setHeader('Content-Type', 'application/json');
  if (isAdmin(req)) {
    return res.status(200).end(JSON.stringify({ ok: true }));
  }
  return res.status(401).end(JSON.stringify({ error: 'Not authenticated' }));
}
