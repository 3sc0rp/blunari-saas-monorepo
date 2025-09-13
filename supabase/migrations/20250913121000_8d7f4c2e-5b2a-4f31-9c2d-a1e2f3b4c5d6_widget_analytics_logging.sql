-- Migration: widget analytics logging tables
-- Created: 2025-09-13
-- Purpose: Persist structured logs for widget-analytics edge function (observability & debugging)

create table if not exists public.widget_analytics_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  correlation_id text not null,
  tenant_id uuid,
  widget_type text,
  time_range text,
  auth_method text,
  duration_ms integer,
  success boolean not null,
  error_code text,
  error_message text,
  request_origin text,
  ip_address text
);

create index if not exists widget_analytics_logs_created_at_idx on public.widget_analytics_logs (created_at desc);
create index if not exists widget_analytics_logs_tenant_id_idx on public.widget_analytics_logs (tenant_id);
create index if not exists widget_analytics_logs_correlation_id_idx on public.widget_analytics_logs (correlation_id);

comment on table public.widget_analytics_logs is 'Structured log records for widget-analytics edge function calls';
