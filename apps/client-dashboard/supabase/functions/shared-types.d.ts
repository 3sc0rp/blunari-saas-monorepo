// Shared Deno type declarations for Supabase Edge Functions

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.38.4" {
  export interface SupabaseClient {
    from(table: string): any;
    rpc(
      functionName: string,
      params?: Record<string, any>,
    ): Promise<{ data: any; error: any }>;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any,
  ): SupabaseClient;
}

declare module "https://deno.land/x/xhr@0.1.0/mod.ts" {
  // XHR polyfill for Deno
}

// Global Web APIs available in Deno
declare global {
  const crypto: {
    subtle: {
      importKey(
        format: string,
        keyData: ArrayBuffer,
        algorithm: { name: string; hash: string },
        extractable: boolean,
        keyUsages: string[],
      ): Promise<CryptoKey>;
      sign(
        algorithm: string,
        key: CryptoKey,
        data: ArrayBuffer,
      ): Promise<ArrayBuffer>;
      digest(algorithm: string, data: ArrayBuffer): Promise<ArrayBuffer>;
    };
    randomUUID(): string;
  };
}
