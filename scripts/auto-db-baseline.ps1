<#
.SYNOPSIS
  Automates aligning local Supabase schema baseline once Docker is running.

.DESCRIPTION
  1. Waits for Docker daemon to become available.
  2. Runs `supabase db pull` to fetch remote schema.
  3. Adds and commits `supabase/schema.sql` if changed.
  4. Optionally creates an initial optimization migration (indexes for analytics) if -CreateAnalyticsMigration is supplied.

.PARAMETER PollSeconds
  Interval between Docker availability checks. Default 5.

.PARAMETER TimeoutSeconds
  Max time to wait for Docker before aborting. Default 600 (10 minutes).

.PARAMETER CreateAnalyticsMigration
  When set, generates a migration adding helpful analytics indexes.

.EXAMPLE
  pwsh ./scripts/auto-db-baseline.ps1 -CreateAnalyticsMigration

.NOTES
  Safe to re-run. Requires: Supabase CLI in PATH, Git initialized, user logged into Supabase.
#>
param(
  [int]$PollSeconds = 5,
  [int]$TimeoutSeconds = 600,
  [switch]$CreateAnalyticsMigration
)

function Write-Step($msg){ Write-Host "[auto-db-baseline] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[auto-db-baseline][WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[auto-db-baseline][ERROR] $msg" -ForegroundColor Red }

$start = Get-Date

# 1. Wait for Docker
Write-Step "Waiting for Docker daemon ... (timeout: $TimeoutSeconds s)"
$dockerReady = $false
while(-not $dockerReady){
  try {
    $ver = docker version --format '{{.Server.Version}}' 2>$null
    if($LASTEXITCODE -eq 0 -and $ver){
      $dockerReady = $true
      Write-Step "Docker is available (server version: $ver)"
      break
    }
  } catch {}
  if(((Get-Date)-$start).TotalSeconds -ge $TimeoutSeconds){
    Write-Err "Timeout waiting for Docker. Exiting."
    exit 1
  }
  Start-Sleep -Seconds $PollSeconds
}

# 2. Run supabase db pull
Write-Step "Running 'supabase db pull' to fetch remote schema"
$pull = supabase db pull 2>&1
if($LASTEXITCODE -ne 0){
  Write-Err "supabase db pull failed:" 
  Write-Host $pull
  exit 2
}
Write-Step "Schema pull completed"

# 3. Stage and commit if changed
if(Test-Path supabase/schema.sql){
  $status = git status --porcelain supabase/schema.sql
  if($status){
    Write-Step "schema.sql changed -> committing baseline"
    git add supabase/schema.sql
    git commit -m "chore(db): baseline schema after migration repair" | Out-Null
  } else {
    Write-Step "No changes in schema.sql (already current)"
  }
} else {
  Write-Warn "schema.sql not found after pull (unexpected)"
}

# 4. Optional analytics migration
if($CreateAnalyticsMigration){
  Write-Step "Creating analytics optimization migration"
  $migName = "add_widget_analytics_indexes"
  $newMigOutput = supabase migration new $migName 2>&1
  if($LASTEXITCODE -ne 0){
    Write-Err "Failed to create migration: $newMigOutput"
    exit 3
  }
  $newFile = (Get-ChildItem supabase/migrations | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
  if($newFile){
    Write-Step "Appending index statements to $newFile"
    @"
-- Analytics performance indexes (idempotent guards)
DO $$ BEGIN
  -- Event type + tenant + created_at for time-range scans
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_events_tenant_type_created'
  ) THEN
    EXECUTE 'CREATE INDEX idx_analytics_events_tenant_type_created ON public.analytics_events(tenant_id, event_type, created_at DESC)';
  END IF;
  -- Bookings tenant + created_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_tenant_created'
  ) THEN
    EXECUTE 'CREATE INDEX idx_bookings_tenant_created ON public.bookings(tenant_id, created_at DESC)';
  END IF;
  -- Catering orders tenant + created_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_catering_orders_tenant_created'
  ) THEN
    EXECUTE 'CREATE INDEX idx_catering_orders_tenant_created ON public.catering_orders(tenant_id, created_at DESC)';
  END IF;
END $$;
"@ | Add-Content $newFile
  } else {
    Write-Warn "Could not determine new migration filename"
  }
  Write-Step "Pushing migration"
  $pushOut = supabase db push 2>&1
  if($LASTEXITCODE -ne 0){
    Write-Err "db push failed: $pushOut"
    exit 4
  }
  git add supabase/migrations/*
  git commit -m "feat(db): analytics performance indexes" | Out-Null
}

# 5. Push commits
$pending = git status --porcelain
if($pending){
  Write-Step "Pushing commits to origin"
  git push origin master | Out-Null
} else {
  Write-Step "No new commits to push"
}

Write-Step "Done."
