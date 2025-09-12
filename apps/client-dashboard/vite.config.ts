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
        dedupe: ['react', 'react-dom', 'scheduler']
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
          // Core React libraries
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
        ],      exclude: [
        // Exclude heavy libraries from pre-bundling to enable lazy loading
        '@huggingface/transformers',
        'chart.js',
        'recharts',
        '@tanstack/react-table',
        'monaco-editor',
        'd3',
        'd3-*',
        
        // Heavy UI components that should be lazy loaded
        'framer-motion',
        '@radix-ui/react-select',
        '@radix-ui/react-dropdown-menu'
      ],
      
      // Force pre-bundling of critical deps
      force: true,
      
      // Enable esbuild optimizations
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        }
      }
    },

    // Build optimizations
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: !isProduction, // keep maps in dev only
      minify: isProduction ? 'terser' : false,

      rollupOptions: {
        output: {
          // Simplified code splitting to prevent function reference issues
          manualChunks: (id) => {
            // Core React ecosystem - keep together to prevent conflicts
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') || 
                id.includes('node_modules/scheduler') ||
                id.includes('node_modules/react-router')) {
              return 'react-vendor';
            }
            
            // UI libraries - group together
            if (id.includes('node_modules/@radix-ui') || 
                id.includes('node_modules/lucide-react') ||
                id.includes('node_modules/framer-motion')) {
              return 'ui-vendor';
            }
            
            // All other vendor dependencies
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
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

      // Enhanced Terser optimization
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2,
          unsafe_arrows: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          reduce_vars: true,
          collapse_vars: true
        },
        mangle: {
          safari10: true,
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: false
        }
      },

  chunkSizeWarningLimit: 500, // Reduced from 1200 to force better splitting
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
    }
  };
});
