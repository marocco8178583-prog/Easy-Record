// Easy Record "connected app" endpoint for Find Medic (Supabase Edge Function, deploy with verify_jwt = false;
// every route authenticates itself). Needs tables from cloud/supabase/migrations/009_findmedic.sql.
//
// Linking (OAuth 2.0 authorization code + PKCE S256, no client secret):
//   GET  /findmedic/oauth/authorize   Find Medic sends the worker here -> redirect to the Easy Record app consent screen
//   POST /findmedic/oauth/approve     (Easy Record user JWT) consent given -> one-time code (5 min) back to Find Medic
//   POST /findmedic/oauth/deny        (Easy Record user JWT) -> access_denied back to Find Medic
//   POST /findmedic/oauth/token       Find Medic server exchanges code + code_verifier -> access token (stored hashed)
//   POST /findmedic/oauth/revoke      (access token) Find Medic unlinks
//   GET  /findmedic/links             (Easy Record user JWT) list my connected apps
//   POST /findmedic/links/revoke      (Easy Record user JWT) { id } disconnect
// Shifts (contract v1, integrations/easy-record/openapi.yaml in Find Medic):
//   POST /findmedic/v1/shifts, PATCH /findmedic/v1/shifts/{id}, POST /findmedic/v1/shifts/{id}/cancel|complete
//   Authorization: Bearer <access token>; X-FindMedic-Signature: t=..,v1=HMAC-SHA256(access token, "t.body"), |now-t| <= 300 s.
// What Find Medic can do: create / update / remove the work days IT created (and create a client for the employer).
// It can never read, change or delete any other record.
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = 'https://easyrecordv5.netlify.app/';
const CLIENTS: Record<string, { name: string; redirects: string[] }> = {
  'find-medic': { name: 'Find Medic', redirects: ['https://wgiahldrrnrqnlprbdyd.supabase.co/functions/v1/easy-record-oauth'] },
};
const APP_ORIGINS = ['https://easyrecordv5.netlify.app', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const DEVICE = 'find-medic';
const enc = new TextEncoder();

const svc = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256hex = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function hmacHex(key: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
async function signatureOk(key: string, body: string, header: string | null) {
  if (!header) return false;
  const p = Object.fromEntries(header.split(',').map(x => x.trim().split('=', 2) as [string, string]));
  const t = Number(p.t);
  if (!Number.isInteger(t) || !p.v1 || Math.abs(Date.now() / 1000 - t) > 300) return false;
  return safeEqual(await hmacHex(key, `${t}.${body}`), p.v1);
}

function corsFor(req: Request): Record<string, string> {
  const o = req.headers.get('origin') ?? '';
  return { 'access-control-allow-origin': APP_ORIGINS.includes(o) ? o : APP_ORIGINS[0], 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
           'access-control-allow-methods': 'GET, POST, OPTIONS', vary: 'origin' };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...corsFor(req) } });

async function appUser(req: Request) {        // Easy Record user signed in to the app
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await svc().auth.getUser(jwt);
  return data.user ?? null;
}
async function linkFor(req: Request) {        // Find Medic calling with a connected-app access token
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token.length < 32) return null;
  const { data } = await svc().from('fm_links').select('id,user_id,client_id').eq('token_hash', await sha256hex(token)).is('revoked_at', null).maybeSingle();
  return data ? { ...data, token } : null;
}

// ------------------------------------------------------------------ Easy Record record helpers (public.records)
type Doc = { t: string; id: number; v: number; u: number; cr?: number; d: boolean; data?: Record<string, unknown> };
const newId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);     // same scheme as the app's uid()
const keyOf = (t: string, id: number) => t + (id < 0 ? 'n' + (-id) : id);     // same as the app's kf()
const TYPE: Record<string, string> = { e: 'entry', c: 'client' };

async function getRow(userId: string, key: string) {
  const { data } = await svc().from('records').select('id,ver,deleted,data').eq('user_id', userId).eq('id', key).maybeSingle();
  return data as { id: string; ver: number; deleted: boolean; data: Doc } | null;
}
async function insertDoc(userId: string, doc: Doc) {
  const { error } = await svc().from('records').insert({ user_id: userId, id: keyOf(doc.t, doc.id), type: TYPE[doc.t], ver: doc.v, deleted: doc.d, data: doc, device_id: DEVICE });
  if (error) throw new Error(error.message);
}
async function updateDoc(userId: string, doc: Doc) {
  const { error } = await svc().from('records').update({ ver: doc.v, deleted: doc.d, data: doc, device_id: DEVICE })
    .eq('user_id', userId).eq('id', keyOf(doc.t, doc.id));
  if (error) throw new Error(error.message);            // version_conflict if the app wrote a newer version meanwhile
}
async function clientIdFor(userId: string, name: string) {
  const want = name.trim().replace(/\s+/g, ' ');
  const { data } = await svc().from('records').select('data').eq('user_id', userId).eq('type', 'client').eq('deleted', false).limit(2000);
  const hit = ((data ?? []) as { data: Doc }[]).map(r => r.data).find((d: Doc) => String(d?.data?.name ?? '').trim().toLowerCase() === want.toLowerCase());
  if (hit) return hit.id;
  const id = newId(), now = Date.now();
  await insertDoc(userId, { t: 'c', id, v: 1, u: now, cr: now, d: false, data: { id, name: want.slice(0, 60), phone: '' } });
  return id;
}

type Shift = { operation?: string; external_assignment_id?: string; title?: string; employer_name?: string; date?: string;
  planned_start?: string; planned_end?: string; agreed_compensation_agorot?: number; map_link?: string; status?: string };
const hhmm = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(+d)) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
};
function entryFields(s: Shift) {
  const amount = Number.isSafeInteger(s.agreed_compensation_agorot) && s.agreed_compensation_agorot! >= 0 ? s.agreed_compensation_agorot! / 100 : 0;
  const note = ['Find Medic', s.title, s.map_link].filter(Boolean).join(' · ').slice(0, 300);
  return { date: s.date!, days: 1, rate: amount, amount, t1: hhmm(s.planned_start), t2: hhmm(s.planned_end), note };
}
const validShift = (s: Shift) => /^[0-9a-f-]{36}$/i.test(s.external_assignment_id ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(s.date ?? '');

async function createShift(userId: string, s: Shift) {
  const db = svc();
  const { data: m } = await db.from('fm_shifts').select('entry_id').eq('user_id', userId).eq('external_assignment_id', s.external_assignment_id!).maybeSingle();
  if (m) return { status: 409, body: { id: keyOf('e', Number(m.entry_id)) } };
  const cid = await clientIdFor(userId, s.employer_name || 'Find Medic');
  const id = newId(), now = Date.now();
  const { error } = await db.from('fm_shifts').insert({ user_id: userId, external_assignment_id: s.external_assignment_id, entry_id: id, client_id: cid });
  if (error) {                                            // created concurrently by a retry: same result
    const { data: m2 } = await db.from('fm_shifts').select('entry_id').eq('user_id', userId).eq('external_assignment_id', s.external_assignment_id!).maybeSingle();
    if (m2) return { status: 409, body: { id: keyOf('e', Number(m2.entry_id)) } };
    throw new Error(error.message);
  }
  try {
    await insertDoc(userId, { t: 'e', id, v: 1, u: now, cr: now, d: false, data: { id, cid, ...entryFields(s), receipt: false, fm: s.external_assignment_id } });
  } catch (e) {          // no work day was written: drop the mapping so the retry creates it instead of reporting "exists"
    await db.from('fm_shifts').delete().eq('user_id', userId).eq('external_assignment_id', s.external_assignment_id!);
    throw e;
  }
  return { status: 201, body: { id: keyOf('e', id) } };
}

async function changeShift(userId: string, ref: string, s: Shift, op: 'update' | 'cancel' | 'complete') {
  const db = svc();
  let entryId: number | null = null;
  const ext = ref.startsWith('ext:') ? ref.slice(4) : s.external_assignment_id;
  if (ext && /^[0-9a-f-]{36}$/i.test(ext)) {
    const { data: m } = await db.from('fm_shifts').select('entry_id').eq('user_id', userId).eq('external_assignment_id', ext).maybeSingle();
    if (m) entryId = Number(m.entry_id);
  }
  if (entryId === null && /^e\d+$/.test(ref)) {           // only work days Find Medic created may be addressed
    const { data: m } = await db.from('fm_shifts').select('entry_id').eq('user_id', userId).eq('entry_id', Number(ref.slice(1))).maybeSingle();
    if (m) entryId = Number(m.entry_id);
  }
  if (entryId === null) return { status: 404, body: { error: 'unknown shift' } };
  const row = await getRow(userId, keyOf('e', entryId));
  if (!row) return { status: 404, body: { error: 'unknown shift' } };
  const removed = op === 'cancel' || s.status === 'cancelled' || s.status === 'no_show';
  if (row.deleted) return { status: 200, body: { id: row.id, deleted: true } };   // removed in the app or already cancelled
  const now = Date.now(), cur = row.data;
  const doc: Doc = removed
    ? { t: 'e', id: entryId, v: row.ver + 1, u: now, d: true }
    : { t: 'e', id: entryId, v: row.ver + 1, u: now, cr: cur.cr, d: false, data: { ...(cur.data ?? {}), ...(validShift(s) ? entryFields(s) : {}) } };
  if (!removed && JSON.stringify(doc.data) === JSON.stringify(cur.data)) return { status: 200, body: { id: row.id } };  // nothing changed
  await updateDoc(userId, doc);
  return { status: 200, body: { id: row.id, deleted: removed } };
}

// ------------------------------------------------------------------ routes
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/findmedic/, '') || '/';
  try {
    // ---- OAuth: authorize -> consent screen in the app
    if (req.method === 'GET' && path === '/oauth/authorize') {
      const q = url.searchParams, c = CLIENTS[q.get('client_id') ?? ''];
      const ru = q.get('redirect_uri') ?? '', cc = q.get('code_challenge') ?? '', state = q.get('state') ?? '';
      if (!c || !c.redirects.includes(ru)) return new Response('unknown client or redirect_uri', { status: 400 });
      const back = new URL(ru);
      if (q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(cc) || !state || state.length > 300) {
        back.search = new URLSearchParams({ error: 'invalid_request', state }).toString(); return Response.redirect(back.toString(), 302);
      }
      const to = new URL(APP_URL);
      to.search = new URLSearchParams({ fm_client: q.get('client_id')!, fm_redirect: ru, fm_cc: cc, fm_state: state }).toString();
      return Response.redirect(to.toString(), 302);
    }
    if (req.method === 'POST' && (path === '/oauth/approve' || path === '/oauth/deny')) {
      const user = await appUser(req);
      if (!user) return json(req, 401, { error: 'sign in to Easy Record first' });
      const b = await req.json().catch(() => ({})) as Record<string, string>;
      const c = CLIENTS[b.client_id ?? ''];
      if (!c || !c.redirects.includes(b.redirect_uri ?? '') || !b.state || !/^[A-Za-z0-9_-]{43}$/.test(b.code_challenge ?? '')) return json(req, 400, { error: 'invalid request' });
      const back = new URL(b.redirect_uri);
      if (path === '/oauth/deny') { back.search = new URLSearchParams({ error: 'access_denied', state: b.state }).toString(); return json(req, 200, { redirect: back.toString() }); }
      const code = randomToken();
      const { error } = await svc().from('fm_oauth_codes').insert({ code_hash: await sha256hex(code), user_id: user.id, client_id: b.client_id,
        redirect_uri: b.redirect_uri, code_challenge: b.code_challenge, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
      if (error) throw new Error(error.message);
      back.search = new URLSearchParams({ code, state: b.state }).toString();
      return json(req, 200, { redirect: back.toString() });
    }
    if (req.method === 'POST' && path === '/oauth/token') {
      const raw = await req.text();
      const b = (req.headers.get('content-type') ?? '').includes('json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
      if (b.grant_type !== 'authorization_code' || !b.code || !b.code_verifier) return json(req, 400, { error: 'invalid_request' });
      const db = svc();
      const { data: row } = await db.from('fm_oauth_codes').select('*').eq('code_hash', await sha256hex(b.code)).maybeSingle();
      const challenge = b64url(await crypto.subtle.digest('SHA-256', enc.encode(String(b.code_verifier))));
      if (!row || row.used_at || new Date(row.expires_at) < new Date() || row.client_id !== b.client_id || row.redirect_uri !== b.redirect_uri
          || !safeEqual(challenge, row.code_challenge)) return json(req, 400, { error: 'invalid_grant' });
      const { data: used } = await db.from('fm_oauth_codes').update({ used_at: new Date().toISOString() }).eq('code_hash', row.code_hash).is('used_at', null).select('code_hash');
      if (!used?.length) return json(req, 400, { error: 'invalid_grant' });       // single use, even under a race
      const token = randomToken() + randomToken();
      const { data: link, error } = await db.from('fm_links').insert({ user_id: row.user_id, client_id: row.client_id, token_hash: await sha256hex(token) }).select('id').single();
      if (error) throw new Error(error.message);
      return json(req, 200, { access_token: token, token_type: 'bearer', scope: 'shifts:write', account_id: link.id });
    }
    if (req.method === 'POST' && path === '/oauth/revoke') {
      const link = await linkFor(req);
      if (link) await svc().from('fm_links').update({ revoked_at: new Date().toISOString() }).eq('id', link.id);
      return json(req, 200, { revoked: true });
    }
    // ---- connected apps, for the Easy Record app
    if (path === '/links' && req.method === 'GET') {
      const user = await appUser(req);
      if (!user) return json(req, 401, { error: 'unauthorized' });
      const { data } = await svc().from('fm_links').select('id,client_id,created_at,last_used_at').eq('user_id', user.id).is('revoked_at', null).order('created_at');
      return json(req, 200, { links: ((data ?? []) as { client_id: string }[]).map(l => ({ ...l, name: CLIENTS[l.client_id]?.name ?? l.client_id })) });
    }
    if (path === '/links/revoke' && req.method === 'POST') {
      const user = await appUser(req);
      if (!user) return json(req, 401, { error: 'unauthorized' });
      const b = await req.json().catch(() => ({})) as { id?: string };
      await svc().from('fm_links').update({ revoked_at: new Date().toISOString() }).eq('user_id', user.id).eq('id', b.id ?? '').is('revoked_at', null);
      return json(req, 200, { revoked: true });
    }
    // ---- shifts (contract v1)
    const m = /^\/v1\/shifts(?:\/([^/]+))?(?:\/(cancel|complete))?$/.exec(path);
    if (m) {
      const link = await linkFor(req);
      if (!link) return json(req, 401, { error: 'invalid token' });
      const body = await req.text();
      if (!(await signatureOk(link.token, body, req.headers.get('x-findmedic-signature')))) return json(req, 401, { error: 'invalid signature' });
      let s: Shift; try { s = JSON.parse(body); } catch { return json(req, 422, { error: 'invalid json' }); }
      await svc().from('fm_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id);
      const ref = m[1] ? decodeURIComponent(m[1]) : '';
      let r: { status: number; body: unknown };
      if (!m[1] && req.method === 'POST') {
        if (!validShift(s)) return json(req, 422, { error: 'external_assignment_id and date are required' });
        r = s.status === 'cancelled' || s.status === 'no_show' ? { status: 422, body: { error: 'not a live shift' } } : await createShift(link.user_id, s);
      } else if (m[1] && !m[2] && req.method === 'PATCH') r = await changeShift(link.user_id, ref, s, s.operation === 'cancel' ? 'cancel' : 'update');
      else if (m[1] && m[2] && req.method === 'POST') r = await changeShift(link.user_id, ref, s, m[2] as 'cancel' | 'complete');
      else return json(req, 405, { error: 'method not allowed' });
      return json(req, r.status, r.body);
    }
    return json(req, 404, { error: 'not found' });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    // A version conflict means the app wrote the same work day at the same moment: 503 so Find Medic retries
    // (it re-reads the latest version). 409 would be treated as success and the change would be lost.
    return json(req, /version_conflict/.test(msg) ? 503 : 500, { error: /version_conflict/.test(msg) ? 'version_conflict, retry' : 'server error' });
  }
});
