import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// Allow overriding backend target via APPOINTMENT_API_URL env var (useful for dev)
const DEFAULT_BACKEND = 'http://localhost:3001';
const PROXY_TARGET = process.env.APPOINTMENT_API_URL || DEFAULT_BACKEND;

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
    // Proxy API requests to backend during development so fetch("/api/...") works
    proxy: {
      '/api': {
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
