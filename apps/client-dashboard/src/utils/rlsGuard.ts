// Runtime RLS guard utilities for client-dashboard
// Ensures queries are always scoped and discourages accidental broad table reads.

import { logger } from '@/utils/logger';

export function assertTenantScoped(queryDescription: string, options: { hasTenantId: boolean; table: string }) {
  if (!options.hasTenantId) {
    logger.warn('RLS_GUARD: query without tenant scope', { table: options.table, desc: queryDescription });
    if (import.meta.env.DEV) {
      // Throw in dev to surface violation early
      throw new Error(`RLS guard violation: ${queryDescription} on table ${options.table} missing tenant scope`);
    }
  }
}
