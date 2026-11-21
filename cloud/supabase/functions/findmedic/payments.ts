// Find Medic payment -> Easy Record payment (pure logic, no I/O; unit-tested in tests/fm-payment-tests.mjs).
//
// When Find Medic reports that the worker was paid for a shift (payment_state = paid_out), Easy Record records ONE payment
// for that work day: amount = the work day's amount, method "Find Medic", today's date (Israel time).
// If the money is taken back (refunded / voided) or the shift is cancelled, that payment is removed again.
// Find Medic only ever touches the payment it created (fm_shifts.payment_id). A payment the user deleted in the app
// is never recreated, and payments the user entered by hand are never touched.

export const PAID_STATES = ['paid_out'];
export const UNDO_STATES = ['refunded', 'voided'];

export type PaymentAction = 'create' | 'remove' | 'none';

/**
 * @param paymentState  payment_state sent by Find Medic (may be missing when the worker does not share it)
 * @param entryRemoved  the work day is deleted (shift cancelled / no show, or deleted in the app)
 * @param hasPayment    Find Medic already created a payment for this shift (fm_shifts.payment_id is set)
 * @param amount        the work day's amount in shekels
 */
export function paymentAction(paymentState: string | undefined, entryRemoved: boolean, hasPayment: boolean, amount: number): PaymentAction {
  if (hasPayment) return entryRemoved || UNDO_STATES.includes(paymentState ?? '') ? 'remove' : 'none';
  if (entryRemoved || !PAID_STATES.includes(paymentState ?? '')) return 'none';
  return Number.isFinite(amount) && amount > 0 ? 'create' : 'none';     // no amount shared and none typed in: nothing to record
}

export function israelToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The payment record as the Easy Record app stores it (S.pays item: {id, cid, date, amount, method, note, alloc:[{eid, amt}]}). */
export function paymentData(id: number, entryId: number, clientId: number, amount: number, title: string | undefined, now = new Date()) {
  const amt = Math.round(amount * 100) / 100;
  return { id, cid: clientId, date: israelToday(now), amount: amt, method: 'Find Medic',
           note: ['Find Medic', title].filter(Boolean).join(' · ').slice(0, 200), alloc: [{ eid: entryId, amt }] };
}
