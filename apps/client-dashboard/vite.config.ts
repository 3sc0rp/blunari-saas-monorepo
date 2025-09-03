import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react'
    ],
    exclude: ['@huggingface/transformers']
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 2000
  },
  esbuild: {
    target: 'es2020'
  }
}));
