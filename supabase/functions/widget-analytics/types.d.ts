// Type definitions for Deno Edge Functions
// This file helps TypeScript understand Deno-specific globals

declare global {
  const Deno: {
    serve: (handler: (req: Request) => Response | Promise<Response>) => void;
    env: {
      get(key: string): string | undefined;
    };
  };
}

export {};
