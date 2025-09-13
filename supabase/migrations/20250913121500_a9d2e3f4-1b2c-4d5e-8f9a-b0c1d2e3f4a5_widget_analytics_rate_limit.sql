-- Migration: widget analytics simple rate limiting support
-- Created: 2025-09-13

create table if not exists public.widget_analytics_rate_limits (
  id bigserial primary key,
  bucket text not null, -- composite key (tenant|ip|hour) or (ip|hour) for anonymous
  window_start timestamptz not null,
  count integer not null default 0,
  constraint widget_analytics_rate_limits_bucket_window_unique unique (bucket, window_start)
);

create index if not exists widget_analytics_rate_limits_window_idx on public.widget_analytics_rate_limits (window_start desc);

comment on table public.widget_analytics_rate_limits is 'Sliding window counters for widget analytics rate limiting';
