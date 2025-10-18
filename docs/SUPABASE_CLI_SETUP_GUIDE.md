# Supabase CLI Setup Guide
# ========================

## Issue: DNS Resolution Error
The CLI is having trouble resolving `aws-1-us-east-1.pooler.supabase.com`

## Solution: Use Direct Database Connection

### Step 1: Get Your Database Password
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/settings/database
2. Find the "Database Password" section
3. Copy your password (you set this when you created the project)

### Step 2: Set Environment Variable (PowerShell)
```powershell
# Set the database password as an environment variable
$env:SUPABASE_DB_PASSWORD = "your-database-password-here"

# Or add to your PowerShell profile for persistence:
# notepad $PROFILE
# Add this line: $env:SUPABASE_DB_PASSWORD = "your-password"
```

### Step 3: Try Different Push Methods

#### Method A: Push with Password Flag
```powershell
npx supabase db push -p "your-database-password"
```

#### Method B: Use Direct Connection String
```powershell
# Get your direct connection string from:
# https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/settings/database

# Format: postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

npx supabase db push --db-url "postgresql://postgres.kbfbbkcaxhzlnbqxwgoz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

#### Method C: Use Transaction Pooler (Different Port)
Try using port 6543 instead of 5432 (transaction pooler):
```powershell
npx supabase db push --db-url "postgresql://postgres.kbfbbkcaxhzlnbqxwgoz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

#### Method D: Use Session Pooler (Port 5432)
```powershell
npx supabase db push --db-url "postgresql://postgres.kbfbbkcaxhzlnbqxwgoz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Step 4: Fix DNS (If Methods Above Don't Work)

#### Windows DNS Cache Clear
```powershell
# Clear DNS cache
ipconfig /flushdns

# Try using Google DNS temporarily
# Control Panel > Network > Change Adapter Settings > Right-click connection > Properties
# Select IPv4 > Properties > Use these DNS servers:
# Preferred: 8.8.8.8
# Alternate: 8.8.4.4
```

### Step 5: Alternative - Use Supabase Studio SQL Editor
If CLI continues to have issues, you can always:
1. Create migration files locally (you already have them)
2. Apply them manually via SQL Editor: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql
3. Then sync: `npx supabase db pull` (to update local migration history)

## Workflow After Fix

Once CLI is working:
```powershell
# 1. Make changes to schema
# 2. Create migration
npx supabase migration new your_migration_name

# 3. Edit the migration file in supabase/migrations/

# 4. Push to remote
npx supabase db push

# 5. Verify
npx supabase migration list
```

## Quick Test Command
```powershell
# Test if you can connect
npx supabase db push --dry-run
```

## Current Status
- ✅ Logged in to Supabase CLI
- ✅ Linked to project: kbfbbkcaxhzlnbqxwgoz
- ✅ Migration files ready: 20250930200928_add_pending_booking_status.sql
- ❌ DNS resolution issue preventing push

## Next Steps
1. Get your database password from Supabase Dashboard
2. Try Method A with the password flag
3. If that fails, try Method C (transaction pooler port 6543)
4. If all fails, use SQL Editor and then pull changes back
