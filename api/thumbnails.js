import { head, put, del } from '@vercel/blob';
import { isAdmin } from './_lib/auth.js';

const PREFIXES = { cover: 'cover-thumbnails/', slide: 'slide-thumbnails/' };

function err(res, message, status = 400) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify({ error: message }));
}

function pathFor(type, name) {
  const prefix = PREFIXES[type];
  if (!prefix || !name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return prefix + trimmed + '.png';
}

export default async function handler(req, res) {
  const type = req.query?.type;
  const name = req.query?.name;
  if (type !== 'cover' && type !== 'slide') return err(res, 'Invalid type: use cover or slide', 400);
  const pathname = pathFor(type, name);
  if (!pathname) return err(res, 'Invalid or missing template name', 400);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      const blob = await head(pathname);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.redirect(302, blob.url);
    } catch (e) {
      console.error('thumbnails GET:', e);
      if (e.message?.includes('not found') || e.message?.includes('BlobNotFoundError')) {
        return err(res, 'Not found', 404);
      }
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
        body = { data: body };
      }
    }
    let buf = null;
    if (Buffer.isBuffer(body)) buf = body;
    else if (body && typeof body === 'object') {
      const raw = body.file ?? body.data ?? body.body;
      if (typeof raw === 'string') buf = Buffer.from(raw, 'base64');
      else if (Buffer.isBuffer(raw)) buf = raw;
    }
    if (!buf || buf.length === 0) {
      return err(res, 'Request body must be image data (e.g. JSON with "data": base64 string)', 400);
    }
    try {
      await put(pathname, buf, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).end(JSON.stringify({ ok: true }));
    } catch (e) {
      console.error('thumbnails PUT:', e);
      return err(res, 'Storage error', 503);
    }
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return err(res, 'Unauthorized', 401);
    try {
      // head() is a basic operation (free), then del() uses the URL
      const blob = await head(pathname);
      if (blob?.url) await del(blob.url);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).end(JSON.stringify({ ok: true }));
    } catch (e) {
      // If blob doesn't exist, deletion is a no-op (success)
      if (e.message?.includes('not found') || e.message?.includes('BlobNotFoundError')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(JSON.stringify({ ok: true }));
      }
      console.error('thumbnails DELETE:', e);
      return err(res, 'Storage error', 503);
    }
  }

  return err(res, 'Method not allowed', 405);
}
