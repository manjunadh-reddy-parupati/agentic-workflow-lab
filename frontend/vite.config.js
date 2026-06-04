import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Single source of truth for all settings lives in <repo>/configs/.env
const CONFIGS_DIR = resolve(__dirname, "..", "configs");

// Dev-server config. Values come from the project config (configs/.env) and
// fall back to sensible defaults. In production the app is served by nginx
// (see Dockerfile/nginx.conf), which handles the /api proxy.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, CONFIGS_DIR, "");
  const target = env.VITE_API_PROXY_TARGET || "http://localhost:8001";
  const port = Number(env.FRONTEND_PORT || 5173);

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
