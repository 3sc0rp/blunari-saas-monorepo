# 🚀 Deployment Guide - Blunari SAAS Platform

This guide walks you through deploying the complete Blunari SAAS platform to production environments.

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites

- [ ] GitHub repository with CI/CD workflows configured
- [ ] Fly.io account and CLI installed
- [ ] Vercel account and CLI installed
- [ ] Supabase project set up
- [ ] All secrets configured in GitHub

### ✅ Environment Verification

- [ ] All tests passing locally
- [ ] TypeScript compilation successful
- [ ] No lint errors or warnings
- [ ] Build process completes successfully
- [ ] Database migrations tested

## 🛠️ Initial Setup

### 1. Clone and Configure Repository

```bash
# Clone the repository
git clone <your-repo-url>
cd blunari-saas

# Install dependencies and set up project
npm run setup

# Verify everything works
npm run quality:check
```

### 2. Configure Secrets

```bash
# Run the interactive secrets setup
npm run secrets:setup

# Or manually set secrets in GitHub repository settings
# Settings → Secrets and variables → Actions
```

### 3. Test Local Development

```bash
# Start all development servers
npm run dev dev:all

# Or start individual services
npm run dev:backend     # Backend API on :5000
npm run dev:admin       # Admin dashboard on :5173
npm run dev:client      # Client dashboard on :5174
```

## 🌐 Backend Deployment (Fly.io)

### Initial Setup

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Navigate to backend directory
cd apps/background-ops

# Create Fly.io app (if not exists)
flyctl launch --no-deploy

# Configure app settings
flyctl deploy
```

### Environment Variables

Set these in your Fly.io app:

```bash
flyctl secrets set \
  NODE_ENV=production \
  DATABASE_URL="your-supabase-connection-string" \
  SUPABASE_URL="your-supabase-url" \
  SUPABASE_ANON_KEY="your-supabase-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  JWT_SECRET="your-jwt-secret" \
  API_KEY="your-api-key"
```

### Health Check

After deployment, verify:

```bash
curl https://services.blunari.ai/health
curl https://services.blunari.ai/api/v1/metrics
```

## 🖥️ Frontend Deployments (Vercel)

### Admin Dashboard Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to admin dashboard
cd apps/admin-dashboard

# Link to Vercel project
vercel link

# Set environment variables
vercel env add VITE_BACKGROUND_OPS_URL production
vercel env add VITE_BACKGROUND_OPS_API_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Deploy to production
vercel --prod
```

### Client Dashboard Setup

```bash
# Navigate to client dashboard
cd apps/client-dashboard

# Link to Vercel project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Deploy to production
vercel --prod
```

### Domain Configuration

Configure custom domains in Vercel dashboard:

- Admin: `admin.blunari.ai`
- Client: `app.blunari.ai`

## 🗄️ Database Setup (Supabase)

### Production Database

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Security Configuration

1. Configure Row Level Security (RLS) policies
2. Set up proper API keys and service roles
3. Configure CORS for your domains
4. Enable email authentication if needed

## 🚀 Automated CI/CD Pipeline

### GitHub Actions Setup

The repository includes comprehensive CI/CD workflows:

1. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Code quality checks
   - Security scanning
   - Testing
   - Build verification

2. **Continuous Deployment** (`.github/workflows/deploy.yml`)
   - Automated deployments
   - Health checks
   - Rollback capabilities

3. **Quality Automation** (`.github/workflows/quality.yml`)
   - Automated code fixes
   - Type safety improvements
   - Quality reports

### Triggering Deployments

```bash
# Push to main branch triggers CI/CD
git push origin main

# Manual deployment trigger
gh workflow run "🚀 Continuous Deployment"

# Manual quality fixes
gh workflow run "🧹 Code Quality Automation"
```

## 🔍 Monitoring & Health Checks

### Application Health

Monitor these endpoints:

- Backend: `https://services.blunari.ai/health`
- Admin: `https://admin.blunari.ai`
- Client: `https://app.blunari.ai`

### Database Health

```sql
-- Check connection
SELECT now();

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies;
```

### Performance Monitoring

- Fly.io metrics: `flyctl metrics --app background-ops`
- Vercel analytics: Available in Vercel dashboard
- Supabase monitoring: Available in Supabase dashboard

## 🛡️ Security Configuration

### API Security

- CORS properly configured for your domains
- API keys secured in environment variables
- Rate limiting enabled
- Input validation in place

### Database Security

- Row Level Security (RLS) enabled
- Proper authentication flows
- Service role keys secured
- Regular security updates

### Frontend Security

- Environment variables properly scoped
- HTTPS enforced
- CSP headers configured
- Sensitive data not exposed in client

## 🔧 Troubleshooting

### Common Deployment Issues

1. **Build Failures**

```bash
# Check local build first
npm run build

# Fix any TypeScript errors
npm run type-check

# Fix lint issues
npm run lint:fix
```

2. **Environment Variables Missing**

```bash
# Verify secrets are set
gh secret list

# Check Fly.io secrets
flyctl secrets list --app background-ops

# Check Vercel environment variables
vercel env ls
```

3. **Database Connection Issues**

```bash
# Test database connection
psql "your-connection-string" -c "SELECT now();"

# Check Supabase status
supabase status
```

4. **CORS Issues**

- Verify domain whitelist in backend configuration
- Check Supabase CORS settings
- Ensure proper headers are sent

### Rollback Procedures

#### Backend Rollback

```bash
# List recent releases
flyctl releases --app background-ops

# Rollback to previous version
flyctl releases rollback --app background-ops
```

#### Frontend Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

#### Database Rollback

```bash
# Create backup first
pg_dump "connection-string" > backup.sql

# Apply migration rollback if needed
supabase migration new rollback_changes
```

## 📊 Performance Optimization

### Backend Optimization

- Use connection pooling for database
- Implement caching strategies
- Optimize database queries
- Enable compression

### Frontend Optimization

- Code splitting and lazy loading
- Asset optimization
- CDN configuration
- Bundle size monitoring

### Database Optimization

- Proper indexing strategy
- Query optimization
- Connection pooling
- Regular maintenance

## 🔄 Maintenance Tasks

### Weekly Tasks

- [ ] Monitor error rates and performance
- [ ] Check security vulnerability reports
- [ ] Review and update dependencies
- [ ] Verify backup procedures

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review and rotate API keys
- [ ] Performance optimization review
- [ ] Security audit

### Quarterly Tasks

- [ ] Infrastructure cost optimization
- [ ] Technology stack updates
- [ ] Disaster recovery testing
- [ ] Team access review

## 🎯 Success Metrics

Track these metrics for deployment success:

- **Deployment Success Rate**: >95%
- **Average Deployment Time**: <10 minutes
- **Zero-Downtime Deployments**: 100%
- **Rollback Time**: <5 minutes
- **Application Uptime**: >99.9%

## 📞 Support & Contact

For deployment issues:

1. Check this documentation first
2. Review GitHub Actions logs
3. Check application logs in respective platforms
4. Contact DevOps team if needed

---

## 📝 Deployment Checklist

Before going live:

- [ ] All tests passing
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Backup procedures verified
- [ ] Monitoring configured
- [ ] Team trained on procedures
- [ ] Documentation updated
- [ ] Rollback plan tested

**🎉 Ready for Production!**
