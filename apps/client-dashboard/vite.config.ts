import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3002,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@blunari/types": path.resolve(__dirname, "../../packages/types/src"),
      "@blunari/utils": path.resolve(__dirname, "../../packages/utils/src"), 
      "@blunari/config": path.resolve(__dirname, "../../packages/config/src"),
    },
  },
  optimizeDeps: {
    include: ["@blunari/types", "@blunari/utils", "@blunari/config"],
  },
}));
