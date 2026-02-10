import { createAdminSession } from '../_lib/auth.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  if (!ADMIN_PASSWORD) {
    return json(res, { error: 'Admin login not configured' }, 503);
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== ADMIN_PASSWORD) {
    return json(res, { error: 'Invalid password' }, 401);
  }

  if (!createAdminSession(res)) {
    return json(res, { error: 'Session creation failed' }, 500);
  }
  json(res, { ok: true });
}
