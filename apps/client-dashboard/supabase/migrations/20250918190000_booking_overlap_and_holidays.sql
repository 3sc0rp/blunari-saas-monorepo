-- Prevent overlapping bookings per table within (booking_time, booking_time + duration)
create extension if not exists btree_gist;

alter table if exists public.bookings drop constraint if exists bookings_no_overlap_per_table;
alter table public.bookings
  add constraint bookings_no_overlap_per_table
  exclude using gist (
    tenant_id with =,
    table_id with =,
    tstzrange(booking_time, booking_time + make_interval(mins := coalesce(duration_minutes, 120))) with &&
  ) where (table_id is not null);

-- Holidays / closures per tenant
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  holiday_date date not null,
  description text,
  created_at timestamptz not null default now()
);
create unique index if not exists holidays_unique on public.holidays(tenant_id, holiday_date);

