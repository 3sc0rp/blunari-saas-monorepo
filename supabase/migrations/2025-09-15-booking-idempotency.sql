-- Idempotency storage for booking mutations (search/hold/confirm primarily confirm)
-- Stores per-tenant idempotent responses keyed by (tenant_id, idempotency_key)

create table if not exists public.idempotency_keys (
  id bigserial primary key,
  tenant_id uuid not null,
  idempotency_key text not null,
  request_id text,
  status_code integer,
  response_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists idempotency_keys_tenant_created_at_idx
  on public.idempotency_keys (tenant_id, created_at desc);

-- Simple trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_on_idempotency_keys on public.idempotency_keys;
create trigger set_updated_at_on_idempotency_keys
before update on public.idempotency_keys
for each row execute function public.set_updated_at();

-- RLS optional: edge functions typically use service role and bypass RLS
alter table public.idempotency_keys enable row level security;

-- Optional policies for admin roles (no-op if service role bypasses)
-- create policy idempotency_admin_all on public.idempotency_keys for all to authenticated using (true);
