create table if not exists public.idempotency_keys (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  idempotency_key text not null,
  request_id text,
  status_code int,
  response_json jsonb,
  created_at timestamptz not null default now(),
  primary key (tenant_id, idempotency_key)
);

create index if not exists idx_idem_created on public.idempotency_keys(created_at desc);

