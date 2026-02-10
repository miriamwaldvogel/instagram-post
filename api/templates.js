import { list, put } from '@vercel/blob';
import { isAdmin } from './_lib/auth.js';

const TEMPLATES_PATH = 'templates.json';

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(data));
}

function err(res, message, status = 400) {
  json(res, { error: message }, status);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: TEMPLATES_PATH, limit: 1 });
      const blob = blobs?.find((b) => b.pathname === TEMPLATES_PATH);
      if (!blob?.url) {
        return json(res, {}, 200);
      }
      const r = await fetch(blob.url);
      if (!r.ok) return err(res, 'Failed to load templates', 502);
      const body = await r.text();
      let data = {};
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        data = {};
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).setHeader('Content-Type', 'application/json').end(JSON.stringify(data));
    } catch (e) {
      console.error('templates GET:', e);
      return err(res, 'Storage error', 503);
    }
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return err(res, 'Unauthorized', 401);
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return err(res, 'Invalid JSON body', 400);
      }
    }
    if (body === null || typeof body !== 'object') return err(res, 'Body must be a JSON object', 400);
    try {
      await put(TEMPLATES_PATH, JSON.stringify(body), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      return json(res, { ok: true });
    } catch (e) {
      console.error('templates PUT:', e);
      return err(res, 'Storage error', 503);
    }
  }

  return err(res, 'Method not allowed', 405);
}
