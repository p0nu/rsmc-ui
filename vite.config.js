import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the Vite server proxies API + WebSocket traffic to the
// collab-engine backend so the browser talks to a single origin (no CORS).
// Override with VITE_PROXY_TARGET if the backend runs elsewhere.
const target = process.env.VITE_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The WebSocket lives at a single, specific path. Give it its own proxy
      // entry with ws:true. Keeping the WebSocket upgrade handler OFF the
      // general /api entry avoids a class of http-proxy bugs where multipart
      // POST bodies (file uploads) intermittently fail with "Failed to fetch".
      "/api/v1/ws": {
        target,
        changeOrigin: true,
        ws: true,
      },
      // All other REST traffic — plain HTTP proxy, no ws.
      "/api": {
        target,
        changeOrigin: true,
      },
      "/healthz": { target, changeOrigin: true },
      "/readyz": { target, changeOrigin: true },
    },
  },
});
