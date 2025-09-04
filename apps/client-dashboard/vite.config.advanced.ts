import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { analyzeBundleSize } from './bundleAnalyzer';

// Advanced Vite configuration for optimal production performance
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh for development
        fastRefresh: !isProduction,
        // Optimize React in production
        babel: isProduction ? {
          plugins: [
            // Remove development-only code
            ['babel-plugin-react-remove-properties', { properties: ['data-testid'] }],
            // Optimize React imports
            ['babel-plugin-import', {
              libraryName: 'antd',
              libraryDirectory: 'es',
              style: 'css'
            }]
          ]
        } : undefined
      }),
      
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
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@types': resolve(__dirname, 'src/types'),
        '@pages': resolve(__dirname, 'src/pages')
      }
    },

    // Development server configuration
    server: {
      port: 3000,
      host: true,
      // Enable hot module replacement
      hmr: {
        overlay: true
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

    // Build optimizations
    build: {
      // Target modern browsers for smaller bundles
      target: 'es2018',
      
      // Output directory
      outDir: 'dist',
      
      // Generate source maps for debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Minification settings
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          // Remove console.log in production
          drop_console: true,
          drop_debugger: true,
          // Remove unused code
          dead_code: true,
          // Optimize boolean expressions
          booleans_as_integers: false,
          // Keep function names for better error stacks
          keep_fnames: true
        },
        mangle: {
          // Keep class names for better debugging
          keep_classnames: true,
          // Keep function names
          keep_fnames: true
        },
        format: {
          // Remove comments
          comments: false
        }
      } : undefined,

      // Rollup-specific options
      rollupOptions: {
        // Code splitting strategy
        output: {
          // Manual chunk splitting for optimal caching
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-ui': ['@radix-ui/react-dropdown-menu', '@radix-ui/react-dialog'],
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
            'vendor-supabase': ['@supabase/supabase-js'],
            
            // Feature-based chunks
            'dashboard': [
              './src/pages/Dashboard.tsx',
              './src/components/dashboard'
            ],
            'auth': [
              './src/pages/Login.tsx',
              './src/pages/Register.tsx',
              './src/components/auth'
            ],
            'admin': [
              './src/pages/Admin.tsx',
              './src/components/admin'
            ]
          },
          
          // Chunk file naming
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId;
            if (facadeModuleId) {
              // Create meaningful chunk names based on module path
              const name = facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '');
              return `chunks/${name || 'chunk'}-[hash].js`;
            }
            return 'chunks/[name]-[hash].js';
          },
          
          // Entry file naming
          entryFileNames: 'assets/[name]-[hash].js',
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
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
        },
        
        // External dependencies (for library mode)
        external: isProduction ? [] : ['react', 'react-dom'],
        
        // Input configuration
        input: {
          main: resolve(__dirname, 'index.html')
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

    // Dependency optimization
    optimizeDeps: {
      // Include dependencies that should be pre-bundled
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'date-fns',
        'clsx'
      ],
      
      // Exclude dependencies from pre-bundling
      exclude: [
        // Large libraries that benefit from dynamic imports
        'chart.js',
        'monaco-editor'
      ],

      // Force optimization for specific packages
      force: isProduction
    },

    // CSS configuration
    css: {
      // PostCSS configuration
      postcss: './postcss.config.js',
      
      // CSS modules configuration
      modules: {
        // Localize class names in development
        localsConvention: 'camelCase',
        generateScopedName: isProduction 
          ? '[hash:base64:8]' 
          : '[name]__[local]___[hash:base64:5]'
      },

      // CSS preprocessing
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },

    // Preview server configuration (for production preview)
    preview: {
      port: 3001,
      host: true,
      strictPort: true
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH || 'dev')
    },

    // Worker configuration for Web Workers
    worker: {
      format: 'es',
      plugins: [react()]
    },

    // Experimental features
    experimental: {
      // Enable build cache for faster rebuilds
      buildAdvancedBaseOptions: {
        skipDependencyOptimization: false
      }
    }
  };
});
