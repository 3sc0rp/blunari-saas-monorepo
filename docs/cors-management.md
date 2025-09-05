# CORS Management Strategy

## 🎯 **Current Implementation: Shared CORS via Inline Sync**

Due to Supabase Edge Functions deployment limitations with shared modules, we use a hybrid approach that maintains the benefits of centralized CORS management while working within deployment constraints.

## 🏗️ **Architecture**

### Source of Truth
- **Primary:** `apps/admin-dashboard/supabase/functions/_shared/cors.ts`
- **Features:** Environment-aware, production/development origins, proper credentials handling

### Deployment Strategy
- **Method:** Inline shared logic into each function
- **Automation:** `scripts/sync-cors.js` for synchronization
- **Benefits:** Works with Supabase deployment, maintains centralized logic

## 🔧 **Current CORS Configuration**

### Production Origins
- `https://admin.blunari.ai`
- `https://services.blunari.ai`
- `https://blunari.ai`
- `https://www.blunari.ai`

### Development Origins
- `http://localhost:5173`
- `http://localhost:3000`
- `http://localhost:8080`
- `http://127.0.0.1:*` equivalents

### Environment Detection
- **Production:** Uses `DENO_DEPLOYMENT_ID` environment variable
- **Development:** Falls back to wildcard (`*`) for easier development

## 📋 **Usage Instructions**

### To Update CORS Configuration:
1. Edit `apps/admin-dashboard/supabase/functions/_shared/cors.ts`
2. Run `node scripts/sync-cors.js` to sync to all functions
3. Deploy functions: `supabase functions deploy admin-tenant-*`

### To Add New Admin Functions:
- Function must start with `admin-tenant-` prefix
- CORS will be auto-synced by the script
- Both root `supabase/functions/` and `apps/admin-dashboard/supabase/functions/` are supported

## 🚀 **Current Status**

✅ **All functions use shared CORS logic**
- Environment-aware origin handling
- Proper credentials support
- Production security hardening
- Development flexibility

✅ **Deployed and working**
- admin-tenant-operations
- admin-tenant-integrations  
- admin-tenant-notes
- admin-tenant-audit
- admin-tenant-churn

## 💡 **Future Improvements**

1. **Build Pipeline Integration:** Add CORS sync to CI/CD
2. **TypeScript Validation:** Ensure shared types across functions  
3. **Supabase CLI Updates:** Monitor for shared module support
4. **Origin Management:** Consider dynamic origin configuration

## 🔍 **Technical Details**

### Why Not Direct Imports?
Supabase Edge Functions deployment doesn't properly resolve `../` imports for shared modules, resulting in deployment failures.

### Why Not Copy Files?
File copying creates maintenance overhead and version drift between functions.

### Why This Approach?
- ✅ Single source of truth maintained
- ✅ Automatic synchronization available
- ✅ Works with deployment constraints
- ✅ Environment-aware configuration
- ✅ Easy to maintain and update

---

**Maintained by:** Senior Developer  
**Last Updated:** September 5, 2025  
**Status:** Production Ready
