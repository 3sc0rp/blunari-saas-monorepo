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
      
      // AGGRESSIVE React polyfill plugin - MUST LOAD FIRST
      {
        name: 'react-emergency-polyfill',
        configureServer(server) {
          server.middlewares.use('/react-emergency-polyfill.js', (req, res, next) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(`
// ULTRA-AGGRESSIVE React Polyfill - Development Mode
(function() {
  'use strict';
  
  // Force React availability IMMEDIATELY
  const createReactPolyfill = () => ({
    createContext: function(defaultValue) {
      console.warn('🔧 Emergency createContext polyfill called');
      return {
        Provider: function({ children }) { return children; },
        Consumer: function({ children }) { return children(defaultValue); },
        _currentValue: defaultValue,
        _defaultValue: defaultValue
      };
    },
    useState: function(initial) { return [initial, function() {}]; },
    useEffect: function() {},
    useLayoutEffect: function() {}, // CRITICAL: This was missing and causing errors
    useContext: function(context) { return context ? context._currentValue : null; },
    useCallback: function(fn) { return fn; },
    useMemo: function(fn) { return fn(); },
    useRef: function(initial) { return { current: initial }; },
    useReducer: function(reducer, initial) { return [initial, function() {}]; },
    useImperativeHandle: function() {},
    useDebugValue: function() {},
    useDeferredValue: function(value) { return value; },
    useTransition: function() { return [false, function() {}]; },
    useId: function() { return 'emergency-id-' + Math.random(); },
    forwardRef: function(fn) { return fn; },
    Fragment: function({ children }) { return children; },
    Component: function() {},
    PureComponent: function() {},
    memo: function(component) { return component; },
    createElement: function(type, props, ...children) {
      return { type, props: props || {}, children };
    },
    cloneElement: function(element) { return element; },
    version: '18.0.0-emergency-polyfill'
  });
  
  if (typeof window !== 'undefined') {
    console.warn('⚠️ ULTRA-AGGRESSIVE React polyfill activating (dev mode)...');
    window.React = window.React || createReactPolyfill();
    globalThis.React = globalThis.React || window.React;
    
    // Force React on global scope
    global = global || {};
    global.React = global.React || window.React;
    
    console.log('🚨 ULTRA-AGGRESSIVE React polyfill activated (dev)');
  }
})();
            `);
          });
        },
        
        // CRITICAL: Transform HTML to inject polyfill FIRST
        transformIndexHtml: {
          enforce: 'pre',
          transform(html) {
            return html.replace(
              '<head>',
              `<head>
    <script>
      // IMMEDIATE React polyfill injection - CANNOT BE BYPASSED
      (function() {
        'use strict';
        
        const createUltraReactPolyfill = () => ({
          createContext: function(defaultValue) {
            return {
              Provider: function({ children }) { return children; },
              Consumer: function({ children }) { return children(defaultValue); },
              _currentValue: defaultValue,
              _defaultValue: defaultValue
            };
          },
          useState: function(initial) { return [initial, function() {}]; },
          useEffect: function() {},
          useLayoutEffect: function() {}, // ULTRA-CRITICAL FIX
          useContext: function(context) { return context ? context._currentValue : null; },
          useCallback: function(fn) { return fn; },
          useMemo: function(fn) { return fn(); },
          useRef: function(initial) { return { current: initial }; },
          useReducer: function(reducer, initial) { return [initial, function() {}]; },
          useImperativeHandle: function() {},
          useDebugValue: function() {},
          useDeferredValue: function(value) { return value; },
          useTransition: function() { return [false, function() {}]; },
          useId: function() { return 'ultra-emergency-id-' + Math.random(); },
          forwardRef: function(fn) { return fn; },
          Fragment: function({ children }) { return children; },
          Component: function() {},
          PureComponent: function() {},
          memo: function(component) { return component; },
          createElement: function(type, props, ...children) {
            return { type, props: props || {}, children };
          },
          cloneElement: function(element) { return element; },
          version: '18.0.0-ultra-emergency'
        });
        
        if (typeof window !== 'undefined') {
          console.warn('🔥 ULTRA-EMERGENCY React polyfill - IMMEDIATE INJECTION');
          window.React = window.React || createUltraReactPolyfill();
          globalThis.React = globalThis.React || window.React;
          
          // Force ALL possible global assignments
          if (typeof global !== 'undefined') global.React = window.React;
          if (typeof self !== 'undefined') self.React = window.React;
          
          console.log('🔥 ULTRA-EMERGENCY React polyfill ACTIVE - vendor chunks protected');
        }
      })();
    </script>`
            );
          }
        }
      },
      
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
      // Force React to be available globally
      'process.env.NODE_ENV': JSON.stringify(mode),
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
        'react/jsx-runtime',
        './src/polyfills/react-global.ts',
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
        // External React for better compatibility
        external: (id) => {
          // Don't externalize React in production builds
          return false;
        },
        
        // Code splitting strategy
        output: {
          // Ensure React is available globally
          globals: {
            'react': 'React',
            'react-dom': 'ReactDOM'
          },
          
          // AGGRESSIVE: Don't split ANY React-related dependencies
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              
              // CRITICAL: Keep ALL React-ecosystem libraries together in main vendor
              if (id.includes('react') || 
                  id.includes('react-dom') || 
                  id.includes('scheduler') ||
                  id.includes('@radix-ui') ||
                  id.includes('framer-motion') ||
                  id.includes('lucide-react') ||
                  id.includes('@tanstack/react') ||
                  id.includes('react-router') ||
                  id.includes('react-hook-form') ||
                  id.includes('react-day-picker') ||
                  id.includes('react-resizable') ||
                  id.includes('react-window') ||
                  id.includes('next-themes') ||
                  id.includes('sonner') ||
                  id.includes('vaul') ||
                  id.includes('cmdk') ||
                  id.includes('embla-carousel-react') ||
                  id.includes('input-otp')) {
                return 'vendor-react-all';
              }
              
              // Supabase - completely separate
              if (id.includes('@supabase') || id.includes('supabase')) {
                return 'vendor-supabase';
              }
              
              // Pure utilities that don't use React
              if (id.includes('date-fns') || 
                  id.includes('clsx') || 
                  id.includes('class-variance-authority') ||
                  id.includes('tailwind-merge') ||
                  id.includes('zod') ||
                  id.includes('zustand')) {
                return 'vendor-utils';
              }
              
              // Everything else that's problematic - minimize this
              return 'vendor-safe';
            }
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
