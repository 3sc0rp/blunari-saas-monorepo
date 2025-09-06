// Deno type declarations for admin-dashboard Supabase Edge Functions

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

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface SupabaseClient {
    from(table: string): any;
    rpc(
      functionName: string,
      params?: Record<string, any>,
    ): Promise<{ data: any; error: any }>;
    auth: {
      getUser(token: string): Promise<{ data: { user: any }; error: any }>;
      admin: {
        getUserByEmail(
          email: string,
        ): Promise<{ data: { user: any } | null; error: any }>;
        createUser(
          params: Record<string, any>,
        ): Promise<{ data: { user: any } | null; error: any }>;
      };
    };
    functions: {
      invoke(functionName: string, options?: { body?: any }): Promise<any>;
    };
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any,
  ): SupabaseClient;
}

declare module "https://deno.land/x/zod@v3.22.4/mod.ts" {
  export interface ZodIssue {
    message: string;
    path: (string | number)[];
    code: string;
  }

  export interface ZodError {
    issues: ZodIssue[];
  }

  export interface ZodType<T = any> {
    safeParse(
      data: unknown,
    ): { success: true; data: T } | { success: false; error: ZodError };
    optional(): ZodType<T | undefined>;
  }

  export interface ZodString extends ZodType<string> {
    email(): ZodString;
    url(): ZodString;
    uuid(): ZodString;
    optional(): ZodType<string | undefined>;
  }

  export interface ZodBoolean extends ZodType<boolean> {
    optional(): ZodType<boolean | undefined>;
  }

  export interface ZodObject<T = any> extends ZodType<T> {
    optional(): ZodType<T | undefined>;
  }

  export const z: {
    object<T>(shape: T): ZodObject<T>;
    string(): ZodString;
    boolean(): ZodBoolean;
  };
}

// Global Web APIs available in Deno
declare global {
  const crypto: {
    randomUUID(): string;
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
  };
}
