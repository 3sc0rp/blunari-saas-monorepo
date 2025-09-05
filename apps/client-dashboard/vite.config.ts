import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { analyzeBundleSize } from './bundleAnalyzer';

// Advanced Vite configuration for optimal production performance
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      
      // Custom plugin for bundle analysis
      {
        name: 'bundle-analyzer',
        generateBundle(options, bundle) {
          if (isProduction) {
            analyzeBundleSize(bundle);
          }
        }
      }
    ],

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
      }
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
      },
      // Proxy configuration for API calls
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      }
    },

    // Environment variables
    define: {
      global: 'globalThis',
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH || 'dev')
    },

    // Dependency optimization
    optimizeDeps: {
      // Include dependencies that should be pre-bundled
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'framer-motion',
        'lucide-react',
        'date-fns',
        'clsx'
      ],
      
      // Exclude dependencies from pre-bundling
      exclude: [
        '@huggingface/transformers',
        'chart.js',
        'monaco-editor'
      ],

      // Force optimization for specific packages
      force: isProduction
    },

    // Build optimizations
    build: {
      // Target modern browsers for smaller bundles
      target: 'es2020',
      
      // Output directory
      outDir: 'dist',
      
      // Generate source maps for debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Minification settings
      minify: isProduction ? 'terser' : false,
      ...(isProduction && {
        terserOptions: {
          compress: {
            // Remove console.log in production
            drop_console: true,
            drop_debugger: true,
            // Remove unused code
            dead_code: true,
            // Optimize boolean expressions
            booleans_as_integers: false,
            // Keep function names for better error stacks
            keep_fnames: false,
            // Advanced compression
            passes: 2,
            pure_funcs: ['console.log', 'console.debug', 'console.trace']
          },
          mangle: {
            // Keep class names for better debugging only in dev builds
            keep_classnames: false,
            // Don't keep function names for smaller bundles
            keep_fnames: false,
            // Mangle properties for even smaller bundles (be careful)
            properties: false
          },
          format: {
            // Remove comments
            comments: false,
            // ASCII only for better compatibility
            ascii_only: true
          }
        }
      }),

      // Rollup-specific options
      rollupOptions: {
        // Code splitting strategy
        output: {
          // Smart dynamic chunk splitting
          manualChunks: (id) => {
            // Only split vendor chunks if they actually exist in node_modules
            if (id.includes('node_modules')) {
              // React and related
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              // Routing
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // Supabase (large library)
              if (id.includes('@supabase') || id.includes('supabase')) {
                return 'vendor-supabase';
              }
              // Queries and state management
              if (id.includes('@tanstack') || id.includes('react-query')) {
                return 'vendor-state';
              }
              // UI and styling
              if (id.includes('@radix-ui') || id.includes('framer-motion') || id.includes('lucide-react')) {
                return 'vendor-ui';
              }
              // Date utilities and other utils
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
                return 'vendor-utils';
              }
              // Everything else goes to vendor-misc
              return 'vendor-misc';
            }
            // Let Vite handle application code automatically
            return undefined;
          },
          
          // Chunk file naming
          chunkFileNames: 'chunks/[name]-[hash].js',
          
          // Entry file naming
          entryFileNames: 'assets/[name]-[hash].js',
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
            
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash].${ext}`;
            }
            if (/css/i.test(ext)) {
              return `styles/[name]-[hash].${ext}`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          }
        }
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      // Build performance optimizations
      reportCompressedSize: isProduction,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Copy public assets
      copyPublicDir: true
    },

    // CSS configuration
    css: {
      // PostCSS configuration
      postcss: './postcss.config.js'
    },

    // Preview server configuration (for production preview)
    preview: {
      port: 3001,
      host: true,
      strictPort: true
    },

    // esbuild configuration
    esbuild: {
      target: 'es2020',
      // Remove console logs in production
      ...(isProduction && {
        drop: ['console', 'debugger']
      })
    },

    // Worker configuration for Web Workers
    worker: {
      format: 'es'
    }
  };
});
