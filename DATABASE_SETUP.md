# DATABASE SETUP GUIDE FOR BLUNARI SAAS

## Option 1: Supabase (Recommended for SAAS)
1. Go to https://supabase.com
2. Create a free account
3. Create a new project
4. Get your connection string from Settings > Database
5. Add to .env file:

DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

## Option 2: Neon (Serverless PostgreSQL)
1. Go to https://neon.tech
2. Create a free account
3. Create a database
4. Copy connection string
5. Add to .env file:

DATABASE_URL=postgresql://[username]:[password]@[hostname]/[dbname]?sslmode=require

## Option 3: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database: createdb blunari_saas
3. Add to .env file:

DATABASE_URL=postgresql://postgres:password@localhost:5432/blunari_saas

## Option 4: Railway
1. Go to https://railway.app
2. Create account and new project
3. Add PostgreSQL service
4. Copy connection string from variables
5. Add to .env file

## Current .env Template
Copy one of the DATABASE_URL options above and update your .env file:

```env
NODE_ENV=development
PORT=3001

# Choose one DATABASE_URL from options above
DATABASE_URL=your-database-connection-string-here

# Optional Redis (can be empty for development)
REDIS_URL=

# Security keys (already configured)
JWT_SECRET=development-jwt-secret-key-for-testing-only
X_API_KEY=development-api-key-for-testing-purposes
SIGNING_SECRET=development-signing-secret-for-testing
WEBHOOK_SECRET=development-webhook-secret

# CORS (already configured)
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:8081,http://localhost:3001

# API URLs (already configured)
API_BASE_URL=http://localhost:3001
CLIENT_BASE_URL=http://localhost:8081

# Logging
LOG_LEVEL=info
METRICS_ENABLED=false
```
