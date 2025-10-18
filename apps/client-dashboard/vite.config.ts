import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Simplified Vite configuration for production builds
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
  plugins: [react() as PluginOption],

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
        // Critical: dedupe React to prevent multiple instances
        dedupe: ['react', 'react-dom', 'scheduler', 'react/jsx-runtime']
      },    // Development server configuration
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

      // Dependency optimization - enhanced for performance
      optimizeDeps: {
        include: [
          // Core React libraries - force bundling together
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-router-dom',
          'scheduler',
          
          // Essential UI libraries
          'lucide-react',
          'clsx',
          'class-variance-authority',
          
          // Utilities
          'date-fns',
          'date-fns/format',
          'date-fns/parseISO',
          'zustand',
          
          // Supabase (pre-bundle for faster loading)
          '@supabase/supabase-js'
        ],
        // Don't exclude anything to prevent chunk reference issues
        exclude: [],
      
      // Enable esbuild optimizations
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        }
      }
    },

    // Build optimizations (debug-friendly for production error diagnosis)
    build: {
      target: 'es2020',
      outDir: 'dist',
      // Force source maps even in production to map minified stack traces
      sourcemap: true,
      // Use esbuild for now (faster & simpler) while diagnosing runtime function errors
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          'public-widget': path.resolve(__dirname, 'public-widget.html')
        },
        output: {
          // Let Vite handle automatic chunking to avoid module resolution issues
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
      // Keep terserOptions field harmless (unused when esbuild minify) for later re-enable
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: false
        },
        mangle: false,
        format: { comments: true }
      },
      chunkSizeWarningLimit: 1200,
      reportCompressedSize: false,
      cssCodeSplit: true,
      copyPublicDir: true,
      // Embed sources for better debugging
      assetsInlineLimit: 4096 // Inline assets < 4KB for better performance
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
    }
  };
});
