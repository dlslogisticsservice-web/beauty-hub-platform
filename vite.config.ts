import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        /**
         * Split heavy vendor libraries into stable, individually-cacheable
         * chunks.  The goal is better cache granularity on repeat visits:
         * vendor chunks (React, TanStack, Supabase) rarely change between
         * deploys, so browsers keep them cached even when app code changes.
         *
         * Recharts + D3 are NOT listed here — they are already isolated into
         * their own lazy chunk via React.lazy() in admin.dashboard.tsx.
         */
        manualChunks(id) {
          // React runtime (react, react-dom, scheduler)
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // TanStack Router + Query
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-tanstack";
          }
          // Supabase client
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
        },
      },
    },
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "beauty-hub-platform-production.up.railway.app",
    ],
  },

  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});