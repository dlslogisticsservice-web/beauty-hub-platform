import { cpSync, mkdirSync, writeFileSync, rmSync } from "node:fs";

rmSync(".vercel/output", { recursive: true, force: true });

// Static assets served by Vercel CDN (JS chunks, CSS, images)
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist/client", ".vercel/output/static", { recursive: true });

// SSR Node.js Serverless Function — wraps dist/server's CF Worker export
// Edge runtime was rejected: it blocks node:crypto, react SSR, h3-v2, tanstack SSR modules.
// Node.js runtime has no such restrictions.
const funcDir = ".vercel/output/functions/index.func";
mkdirSync(funcDir, { recursive: true });
cpSync("dist/server", funcDir, { recursive: true });

// Vercel Node.js runtime expects a function export, not CF Worker object { fetch }.
// This adapter bridges the two formats.
writeFileSync(
  `${funcDir}/index.mjs`,
  `import worker from "./server.js";\nexport default async function handler(request) {\n  return worker.fetch(request, {}, { waitUntil: () => {}, passThroughOnException: () => {} });\n}\n`
);

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.mjs", maxDuration: 30 })
);

// Routing: serve static files first, then fall through to SSR function
writeFileSync(
  ".vercel/output/config.json",
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2
  )
);

console.log("Vercel Build Output API layout ready.");
