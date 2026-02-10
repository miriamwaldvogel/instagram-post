import crypto from 'crypto';

const COOKIE_NAME = 'audience_admin';
const TTL_SEC = 7 * 24 * 60 * 60; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return secret;
}

function sign(payload) {
  const secret = getSecret();
  if (!secret) return null;
  const data = Buffer.from(payload, 'utf8');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64url');
}

function createSession() {
  const payload = JSON.stringify({
    u: 'admin',
    exp: Date.now() + TTL_SEC * 1000,
  });
  const sig = sign(payload);
  if (!sig) return null;
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + sig;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return false;
  const secret = getSecret();
  if (!secret) return false;
  const i = token.lastIndexOf('.');
  if (i === -1) return false;
  const payloadB64 = token.slice(0, i);
  const sig = token.slice(i + 1);
  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = sign(payload);
    if (expectedSig !== sig || !expectedSig) return false;
    const data = JSON.parse(payload);
    if (data.u !== 'admin' || !data.exp) return false;
    if (Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function getSessionCookie(req) {
  const raw = req.headers?.cookie;
  if (!raw) return null;
  const match = raw.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export function isAdmin(req) {
  const token = getSessionCookie(req);
  return verifySession(token);
}

function isProduction() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export function setSessionCookie(res, token) {
  const secure = isProduction() ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${TTL_SEC}`,
  ]);
}

export function clearSessionCookie(res) {
  const secure = isProduction() ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`,
  ]);
}

export function createAdminSession(res) {
  const token = createSession();
  if (!token) return false;
  setSessionCookie(res, token);
  return true;
}

export { COOKIE_NAME };
