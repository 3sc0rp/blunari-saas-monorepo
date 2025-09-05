import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import inject from '@rollup/plugin-inject';

// Simplified Vite configuration for production builds
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
  plugins: [react()],

    // Path resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@integrations': path.resolve(__dirname, 'src/integrations'),
        '@lib': path.resolve(__dirname, 'src/lib')
      },
      dedupe: ['react', 'react-dom']
    },

    // Development server configuration
    server: {
      host: "::",
      port: 8080,
      // Enable hot module replacement
      hmr: {
        overlay: true
      },
      fs: {
        strict: false
      }
    },

    // Environment variables
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(mode),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH || 'dev')
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'framer-motion',
        'lucide-react',
        'date-fns',
        'clsx'
      ],
      
      exclude: [
        '@huggingface/transformers',
        'chart.js',
        'monaco-editor'
      ]
    },

    // Build optimizations
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: !isProduction, // keep maps in dev only
      minify: isProduction ? 'terser' : false,

      rollupOptions: {
        plugins: [
          inject({
            React: ['react', 'default']
          })
        ],
  output: {
          inlineDynamicImports: true,
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) return `images/[name]-[hash].${ext}`;
            if (/css/i.test(ext)) return `styles/[name]-[hash].${ext}`;
            if (/woff2?|eot|ttf|otf/i.test(ext)) return `fonts/[name]-[hash].${ext}`;
            return `assets/[name]-[hash].${ext}`;
          }
        }
      },

  chunkSizeWarningLimit: 1200,
  reportCompressedSize: isProduction,
  cssCodeSplit: true,
  copyPublicDir: true
    },

    css: {
      postcss: './postcss.config.js'
    },

    preview: {
      port: 4174,
      host: true,
      strictPort: false
    },

    esbuild: {
      target: 'es2020'
    },
    // Extra terser options to drop console/debugger only in prod
    ...(isProduction && {
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    })
  };
});
