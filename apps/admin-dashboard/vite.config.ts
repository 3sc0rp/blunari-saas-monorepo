import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    define: {
      global: "globalThis",
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    build: {
      sourcemap: !isProduction,
      target: "es2020",
    },
    esbuild: {
      target: "es2020",
    },
  };
});
