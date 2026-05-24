import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Prevent double-execution: both client and SSR environments call closeBundle.
let vercelOutputDone = false;

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tsconfigPaths(),
    {
      name: "vercel-build-output",
      async closeBundle() {
        if (vercelOutputDone) return;
        const { existsSync } = await import("node:fs");
        // Only run after the SSR build produces server.js; skip the client build pass.
        if (!existsSync("dist/server/server.js")) return;
        vercelOutputDone = true;
        const { spawnSync } = await import("node:child_process");
        console.log("[vercel-output] Generating Build Output API structure...");
        const result = spawnSync(
          process.execPath,
          ["scripts/build-vercel.mjs"],
          { stdio: "inherit" }
        );
        if (result.status !== 0) process.exit(result.status ?? 1);
      },
    },
  ],

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