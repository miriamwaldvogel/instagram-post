/**
 * One-time migration: upload templates.json and cover/slide thumbnails to Vercel Blob.
 * Run from project root after: vercel env pull
 *   node scripts/migrate-blob.js
 * The script loads .env.local (or .env) so you don't need to export vars manually.
 */
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Load .env.local or .env into process.env (only sets vars that are not already set). */
async function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = join(ROOT, name);
    try {
      const content = await readFile(path, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
          value = value.slice(1, -1);
        if (key && process.env[key] === undefined) process.env[key] = value;
      }
      return;
    } catch {
      /* file missing, try next */
    }
  }
}

async function main() {
  await loadEnv();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('Set BLOB_READ_WRITE_TOKEN (e.g. run `vercel env pull` first).');
    process.exit(1);
  }

  const opts = { access: 'public', addRandomSuffix: false, allowOverwrite: true, token };

  // 1. templates.json
  const templatesPath = join(ROOT, 'templates.json');
  const templatesJson = await readFile(templatesPath, 'utf8');
  await put('templates.json', templatesJson, {
    ...opts,
    contentType: 'application/json',
  });
  console.log('Uploaded templates.json');

  // 2. cover-thumbnails
  const coverDir = join(ROOT, 'cover-thumbnails');
  const coverFiles = (await readdir(coverDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .map((e) => e.name);
  for (const name of coverFiles) {
    const pathname = `cover-thumbnails/${name}`;
    const buf = await readFile(join(coverDir, name));
    await put(pathname, buf, { ...opts, contentType: 'image/png' });
    console.log('Uploaded', pathname);
  }

  // 3. slide-thumbnails
  const slideDir = join(ROOT, 'slide-thumbnails');
  const slideFiles = (await readdir(slideDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .map((e) => e.name);
  for (const name of slideFiles) {
    const pathname = `slide-thumbnails/${name}`;
    const buf = await readFile(join(slideDir, name));
    await put(pathname, buf, { ...opts, contentType: 'image/png' });
    console.log('Uploaded', pathname);
  }

  console.log('Migration done. Set ADMIN_PASSWORD and SESSION_SECRET in Vercel, then use /admin to manage templates.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
