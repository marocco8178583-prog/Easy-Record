// Find Medic server function (cloud/supabase/functions/findmedic/index.ts) against an IN-MEMORY MOCK of the database.
// Runs the real function code (TypeScript stripped with esbuild) and checks what happens to the worker's work days
// when Find Medic updates or cancels a shift. Simulation only: no real Supabase project is touched.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = (() => { try { return require(process.env.ESBUILD || 'esbuild'); } catch (e) { return require('/opt/npm-tools/node_modules/esbuild'); } })();
const res = []; const ok = (n, c, d) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + d)); };

// ---- tiny in-memory stand-in for the supabase-js query builder (only what the function uses)
const tables = { records: [], fm_shifts: [], fm_links: [], fm_oauth_codes: [] };
function q(name) {
  const st = { f: [], op: 'select', vals: null, limit: Infinity };
  const rows = () => tables[name].filter(r => st.f.every(fn => fn(r)));
  const run = () => {
    if (st.op === 'insert') {
      const v = Array.isArray(st.vals) ? st.vals : [st.vals];
      if (name === 'fm_shifts' && v.some(n => tables.fm_shifts.some(r => r.user_id === n.user_id && r.external_assignment_id === n.external_assignment_id))) return { data: null, error: { message: 'duplicate' } };
      if (name === 'records' && v.some(n => tables.records.some(r => r.user_id === n.user_id && r.id === n.id))) return { data: null, error: { message: 'duplicate' } };
      v.forEach(n => tables[name].push({ id: n.id ?? crypto.randomUUID(), ...n }));
      return { data: v, error: null };
    }
    if (st.op === 'update') {
      const hit = rows();
      if (name === 'records' && hit.some(r => st.vals.ver <= r.ver)) return { data: null, error: { message: 'version_conflict' } };
      hit.forEach(r => Object.assign(r, st.vals)); return { data: hit, error: null };
    }
    if (st.op === 'delete') { const hit = rows(); tables[name] = tables[name].filter(r => !hit.includes(r)); return { data: hit, error: null }; }
    return { data: rows().slice(0, st.limit).map(r => JSON.parse(JSON.stringify(r))), error: null };
  };
  const b = {
    select() { return b; }, insert(v) { st.op = 'insert'; st.vals = v; return b; }, update(v) { st.op = 'update'; st.vals = v; return b; },
    delete() { st.op = 'delete'; return b; }, eq(k, v) { st.f.push(r => r[k] === v); return b; }, is(k, v) { st.f.push(r => (r[k] ?? null) === v); return b; },
    limit(n) { st.limit = n; return b; }, order() { return b; },
    maybeSingle() { const r = run(); return Promise.resolve({ data: r.data ? r.data[0] ?? null : null, error: r.error }); },
    single() { const r = run(); return Promise.resolve({ data: r.data ? r.data[0] : null, error: r.error }); },
    then(a, c) { return Promise.resolve(run()).then(a, c); },
  };
  return b;
}
globalThis.__mockSupabase = { createClient: () => ({ from: q, auth: { getUser: async () => ({ data: { user: null } }) } }) };
let handler; globalThis.Deno = { env: { get: () => 'x' }, serve: h => { handler = h; } };

(async () => {
  let src = fs.readFileSync(path.join(__dirname, '..', 'cloud', 'supabase', 'functions', 'findmedic', 'index.ts'), 'utf8');
  src = src.replace(/import \{ createClient \} from 'npm:@supabase\/supabase-js@2';/, 'const { createClient } = globalThis.__mockSupabase;');
  // bundle, so the function's own local modules (e.g. ./payments.ts) are included
  const dir = path.join(__dirname, '..', 'cloud', 'supabase', 'functions', 'findmedic');
  const js = (await esbuild.build({ stdin: { contents: src, loader: 'ts', resolveDir: dir, sourcefile: 'index.ts' }, bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'silent' })).outputFiles[0].text;
  new Function('require', js)(require);
  ok('קוד הפונקציה נטען', typeof handler === 'function', 'Deno.serve not called');

  const USER = 'u1', TOKEN = 'T'.repeat(64);
  tables.fm_links.push({ id: 'L1', user_id: USER, client_id: 'find-medic', token_hash: crypto.createHash('sha256').update(TOKEN).digest('hex'), revoked_at: null });
  const call = async (method, p, body) => {
    const raw = JSON.stringify(body || {}), t = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', TOKEN).update(t + '.' + raw).digest('hex');
    const r = await handler(new Request('https://x.supabase.co/functions/v1/findmedic' + p, { method, body: raw, headers: { authorization: 'Bearer ' + TOKEN, 'x-findmedic-signature': `t=${t},v1=${sig}` } }));
    return { status: r.status, body: await r.json() };
  };
  const entry = id => tables.records.find(r => r.id === id);
  const appEdit = (id, patch) => { const r = entry(id); r.data = { ...r.data, v: r.ver + 1, data: { ...r.data.data, ...patch } }; r.ver++; };
  const ext = n => '00000000-0000-4000-8000-00000000000' + n;
  const shift = (n, o) => ({ external_assignment_id: ext(n), employer_name: 'בית חולים', title: 'משמרת', date: '2026-12-01',
    planned_start: '2026-12-01T06:00:00Z', planned_end: '2026-12-01T14:00:00Z', agreed_compensation_agorot: 80000, ...o });

  // 1. create
  let r = await call('POST', '/v1/shifts', shift(1)); const id1 = r.body.id;
  ok('יצירת משמרת יוצרת יום עבודה עם הסכום', r.status === 201 && entry(id1)?.data.data.amount === 800, JSON.stringify(r));

  // 2. untouched day: a reschedule with new pay updates date, hours and pay
  r = await call('PATCH', '/v1/shifts/ext:' + ext(1), shift(1, { date: '2026-12-02', planned_start: '2026-12-02T07:00:00Z', agreed_compensation_agorot: 90000 }));
  let d = entry(id1).data.data;
  ok('יום שלא נערך באפליקציה מתעדכן במלואו (תאריך, שעה, סכום)', d.date === '2026-12-02' && d.t1 === '09:00' && d.amount === 900, JSON.stringify(d));

  // 3. worker edits pay + note in the app, then Find Medic reschedules: pay and note stay, date moves
  appEdit(id1, { amount: 1000, rate: 1000, note: 'כולל נסיעות' });
  r = await call('PATCH', '/v1/shifts/ext:' + ext(1), shift(1, { date: '2026-12-03', planned_start: '2026-12-03T07:00:00Z', agreed_compensation_agorot: 90000 }));
  d = entry(id1).data.data;
  ok('סכום שתוקן ביד לא נדרס בעדכון מ-Find Medic', d.amount === 1000 && d.rate === 1000, JSON.stringify(d));
  ok('הערה שנכתבה ביד לא נדרסת', d.note === 'כולל נסיעות', d.note);
  ok('התאריך עדיין מתעדכן לפי שינוי המועד', d.date === '2026-12-03', d.date);

  // 4. "complete" with the same data does not touch the edited day
  const ver = entry(id1).ver;
  r = await call('POST', '/v1/shifts/ext:' + ext(1) + '/complete', shift(1, { date: '2026-12-03', planned_start: '2026-12-03T07:00:00Z', agreed_compensation_agorot: 90000 }));
  ok('סיום משמרת בלי שינוי לא כותב מחדש את היום', entry(id1).ver === ver && entry(id1).data.data.amount === 1000, JSON.stringify(entry(id1).data.data));

  // 4b. actual hours: check-in / check-out times from Find Medic replace the planned ones
  r = await call('POST', '/v1/shifts', shift(4)); const id4 = r.body.id;
  ok('בלי שעות בפועל: השעות המתוכננות', entry(id4).data.data.t1 === '08:00' && entry(id4).data.data.t2 === '16:00', JSON.stringify(entry(id4).data.data));
  r = await call('PATCH', '/v1/shifts/ext:' + ext(4), shift(4, { actual_start: '2026-12-01T05:52:00Z' }));
  d = entry(id4).data.data;
  ok('צ׳ק-אין: שעת ההתחלה בפועל נרשמת, הסיום עדיין מתוכנן', d.t1 === '07:52' && d.t2 === '16:00', JSON.stringify(d));
  r = await call('POST', '/v1/shifts/ext:' + ext(4) + '/complete', shift(4, { actual_start: '2026-12-01T05:52:00Z', actual_end: '2026-12-01T14:37:00Z' }));
  d = entry(id4).data.data;
  ok('צ׳ק-אאוט: שעת הסיום בפועל נרשמת', d.t1 === '07:52' && d.t2 === '16:37', JSON.stringify(d));
  ok('שעות בפועל לא משנות סכום ותאריך', d.amount === 800 && d.date === '2026-12-01', JSON.stringify(d));

  // 5. pay not shared: an update without a sum never zeroes a typed sum
  r = await call('POST', '/v1/shifts', shift(2, { agreed_compensation_agorot: undefined })); const id2 = r.body.id;
  ok('משמרת בלי סכום נוצרת עם 0', entry(id2).data.data.amount === 0, JSON.stringify(entry(id2).data.data));
  appEdit(id2, { amount: 650, rate: 650 });
  r = await call('PATCH', '/v1/shifts/ext:' + ext(2), shift(2, { agreed_compensation_agorot: undefined, date: '2026-12-05' }));
  d = entry(id2).data.data;
  ok('עדכון בלי סכום לא מאפס סכום שהוזן ביד', d.amount === 650 && d.date === '2026-12-05', JSON.stringify(d));

  // 6. cancel an unpaid shift: day removed
  r = await call('POST', '/v1/shifts/ext:' + ext(2) + '/cancel', shift(2));
  ok('ביטול משמרת שלא שולמה מוחק את יום העבודה', r.body.deleted === true && entry(id2).deleted === true, JSON.stringify(r));

  // 7. cancel a paid shift: day kept, marked, payment still points at it
  const eid1 = Number(id1.slice(1));
  tables.records.push({ user_id: USER, id: 'p1', type: 'payment', ver: 1, deleted: false, data: { t: 'p', id: 1, v: 1, d: false, data: { id: 1, amount: 500, alloc: [{ eid: eid1, amt: 500 }] } } });
  r = await call('POST', '/v1/shifts/ext:' + ext(1) + '/cancel', shift(1));
  d = entry(id1).data.data;
  ok('ביטול משמרת ששולמה לא מוחק את היום (התשלום לא נשאר יתום)', entry(id1).deleted === false && r.body.kept_paid === true, JSON.stringify(r));
  ok('היום מסומן "בוטל ב-Find Medic" וההערה המקורית נשמרת', d.note === 'בוטל ב-Find Medic · כולל נסיעות' && d.fmCancelled === true && d.amount === 1000, JSON.stringify(d));
  const v2 = entry(id1).ver; await call('POST', '/v1/shifts/ext:' + ext(1) + '/cancel', shift(1));
  ok('ביטול חוזר לא מכפיל את הסימון', entry(id1).ver === v2 && entry(id1).data.data.note === d.note, entry(id1).data.data.note);

  // 8. day created before this fix (no fmv): a typed sum is kept, a 0 sum is filled in
  r = await call('POST', '/v1/shifts', shift(3)); const id3 = r.body.id;
  const old = entry(id3); delete old.data.data.fmv; old.data.data.amount = 700; old.data.data.rate = 700;
  await call('PATCH', '/v1/shifts/ext:' + ext(3), shift(3, { agreed_compensation_agorot: 95000 }));
  ok('יום ישן (לפני התיקון) עם סכום: הסכום נשמר', entry(id3).data.data.amount === 700, JSON.stringify(entry(id3).data.data));

  // 9. still only its own days: a day the app created cannot be touched
  tables.records.push({ user_id: USER, id: 'e42', type: 'entry', ver: 1, deleted: false, data: { t: 'e', id: 42, v: 1, d: false, data: { id: 42, amount: 300 } } });
  r = await call('POST', '/v1/shifts/e42/cancel', {});
  ok('Find Medic לא יכולה לבטל יום עבודה שלא היא יצרה', r.status === 404 && entry('e42').deleted === false, JSON.stringify(r));

  const n = res.filter(Boolean).length; console.log(n + '/' + res.length + ' passed'); process.exit(n === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
