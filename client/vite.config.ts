// client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEFAULT_BACKEND = 'http://localhost:3001';
const PROXY_TARGET = process.env.APPOINTMENT_API_URL || DEFAULT_BACKEND;
const GATEWAY_PROXY = process.env.VITE_API_GATEWAY_URL || process.env.API_GATEWAY_URL || '';
const NOTIFICATION_SERVICE_URL = process.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: GATEWAY_PROXY || PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
      // Add notification service proxy
      '/notifications-api': {
        target: NOTIFICATION_SERVICE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/notifications-api/, '/api'),
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