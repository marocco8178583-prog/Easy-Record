// Find Medic payment -> Easy Record payment: pure logic of cloud/supabase/functions/findmedic/payments.ts.
// Run: node --experimental-strip-types tests/fm-payment-tests.mjs
import { paymentAction, paymentData, israelToday } from '../cloud/supabase/functions/findmedic/payments.ts';

const res = [];
const ok = (n, c, d) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(d))); };

// when to add a payment
ok('paid_out + live work day + amount -> create', paymentAction('paid_out', false, false, 600) === 'create');
ok('paid_out twice -> no second payment', paymentAction('paid_out', false, true, 600) === 'none');
ok('payout_pending -> nothing yet', paymentAction('payout_pending', false, false, 600) === 'none');
ok('captured / held -> nothing yet', paymentAction('captured', false, false, 600) === 'none' && paymentAction('held', false, false, 600) === 'none');
ok('no payment_state shared -> nothing', paymentAction(undefined, false, false, 600) === 'none');
ok('paid_out but amount 0 (not shared) -> nothing', paymentAction('paid_out', false, false, 0) === 'none');
ok('paid_out but work day deleted -> nothing', paymentAction('paid_out', true, false, 600) === 'none');
ok('NaN amount -> nothing', paymentAction('paid_out', false, false, NaN) === 'none');
// when to take it back
ok('refunded after payment -> remove', paymentAction('refunded', false, true, 600) === 'remove');
ok('voided after payment -> remove', paymentAction('voided', false, true, 600) === 'remove');
ok('shift cancelled (work day removed) -> remove', paymentAction('paid_out', true, true, 600) === 'remove');
ok('disputed -> keep (money not taken back yet)', paymentAction('disputed', false, true, 600) === 'none');
ok('refunded with no payment -> nothing', paymentAction('refunded', false, false, 600) === 'none');

// the record written to Easy Record
const at = new Date('2026-11-20T23:30:00Z');          // 01:30 on 21 Nov in Israel
const p = paymentData(17, 1001, 2002, 612.345, 'טיול שנתי', at);
ok('date is Israel date', p.date === '2026-11-21', p.date);
ok('amount rounded to agorot', p.amount === 612.35 && p.alloc[0].amt === 612.35, p);
ok('allocated to the work day only', p.alloc.length === 1 && p.alloc[0].eid === 1001, p.alloc);
ok('client + method + note', p.cid === 2002 && p.method === 'Find Medic' && p.note === 'Find Medic · טיול שנתי', p);
ok('note without title', paymentData(1, 2, 3, 10, undefined, at).note === 'Find Medic');
ok('israelToday format', /^\d{4}-\d{2}-\d{2}$/.test(israelToday()));

const failed = res.filter(x => !x).length;
console.log(`\n${res.length - failed}/${res.length} passed`);
process.exit(failed ? 1 : 0);
