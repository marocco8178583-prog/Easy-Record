-- Easy Record <- Find Medic payments: remember the ONE payment Find Medic recorded for a shift (paid_out),
-- so it is added once and removed again on refund / void / cancellation.
-- Additive only (one nullable column). Safe to run again.
alter table public.fm_shifts add column if not exists payment_id bigint;
