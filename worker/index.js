import { DurableObject } from 'cloudflare:workers';
import { html, css, app } from './ui.js';

const MAX_STATE_BYTES = 2 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export class GarageState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS garage_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        revision INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        media_type TEXT NOT NULL,
        image BLOB NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/state') {
      if (request.method === 'GET') {
        const rows = this.ctx.storage.sql.exec(
          'SELECT state_json, revision, updated_at FROM garage_state WHERE id = 1'
        ).toArray();
        if (!rows.length) return json({ state: null, revision: 0 });
        return json({ state: JSON.parse(rows[0].state_json), revision: rows[0].revision, updatedAt: rows[0].updated_at });
      }

      if (request.method === 'PUT') {
        const length = Number(request.headers.get('content-length') || 0);
        if (length > MAX_STATE_BYTES) return json({ error: 'State payload is too large.' }, 413);
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_STATE_BYTES) return json({ error: 'State payload is too large.' }, 413);
        let state;
        try { state = JSON.parse(raw); } catch (_) { return json({ error: 'Invalid JSON.' }, 400); }
        if (!state || typeof state !== 'object' || !Array.isArray(state.records) || !Array.isArray(state.refuels) || !Array.isArray(state.reminders)) {
          return json({ error: 'Invalid garage state.' }, 400);
        }
        if (state.records.length > 1000 || state.refuels.length > 3000 || state.reminders.length > 1000) {
          return json({ error: 'Garage capacity exceeded.' }, 413);
        }
        const current = this.ctx.storage.sql.exec('SELECT revision FROM garage_state WHERE id = 1').toArray();
        const revision = current.length ? Number(current[0].revision) + 1 : 1;
        const updatedAt = new Date().toISOString();
        this.ctx.storage.sql.exec(
          `INSERT INTO garage_state (id, state_json, revision, updated_at)
           VALUES (1, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json,
             revision = excluded.revision, updated_at = excluded.updated_at`,
          JSON.stringify(state), revision, updatedAt
        );
        return json({ saved: true, revision, updatedAt });
      }
      return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' });
    }

    const photoMatch = url.pathname.match(/^\/photos\/([A-Za-z0-9_-]{1,80})$/);
    if (photoMatch) {
      const id = photoMatch[1];
      if (request.method === 'GET') {
        const rows = this.ctx.storage.sql.exec('SELECT media_type, image FROM photos WHERE id = ?', id).toArray();
        if (!rows.length) return json({ error: 'Photo not found.' }, 404);
        return new Response(rows[0].image, {
          headers: { 'Content-Type': rows[0].media_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
        });
      }
      if (request.method === 'PUT') {
        const contentType = (request.headers.get('content-type') || '').split(';')[0].toLowerCase();
        if (!PHOTO_TYPES.has(contentType)) return json({ error: 'Unsupported photo type.' }, 415);
        const length = Number(request.headers.get('content-length') || 0);
        if (length > MAX_PHOTO_BYTES) return json({ error: 'Photo is too large.' }, 413);
        const image = new Uint8Array(await request.arrayBuffer());
        if (!image.byteLength || image.byteLength > MAX_PHOTO_BYTES) return json({ error: 'Photo is too large or empty.' }, 413);
        this.ctx.storage.sql.exec(
          `INSERT INTO photos (id, media_type, image, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET media_type = excluded.media_type,
             image = excluded.image, created_at = excluded.created_at`,
          id, contentType, image, new Date().toISOString()
        );
        return json({ saved: true }, 201);
      }
      if (request.method === 'DELETE') {
        this.ctx.storage.sql.exec('DELETE FROM photos WHERE id = ?', id);
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      }
      return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT, DELETE' });
    }

    return json({ error: 'Not found.' }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return new Response('Cross-origin requests are not allowed.', { status: 403 });
      const stub = env.GARAGE_STATE.get(env.GARAGE_STATE.idFromName('garagem-hugo'));
      const target = new URL(url.pathname.slice(4) + url.search, 'https://garage-state.internal');
      return stub.fetch(new Request(target, request));
    }

    const content = url.pathname === '/' || url.pathname === '/index.html' ? html
      : url.pathname === '/styles.css' ? css
      : url.pathname === '/app.js' ? app : null;
    if (content === null) return new Response('Not found.', { status: 404 });
    const contentType = url.pathname === '/styles.css' ? 'text/css; charset=utf-8'
      : url.pathname === '/app.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    };
    if (contentType.startsWith('text/html')) {
      headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'";
      headers['Referrer-Policy'] = 'no-referrer';
    }
    return new Response(content, { headers });
  }
};
