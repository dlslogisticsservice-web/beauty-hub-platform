import { cpSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync(".vercel/output", { recursive: true, force: true });

// Static assets served by Vercel CDN (JS chunks, CSS, images)
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist/client", ".vercel/output/static", { recursive: true });

// SSR serverless function directory
const funcDir = ".vercel/output/functions/index.func";
mkdirSync(funcDir, { recursive: true });

// The @cloudflare/vite-plugin server build externalizes ALL npm packages
// (h3-v2, react, @tanstack/*, seroval, crypto, etc.) because CF Workers
// resolves modules through its own runtime — not node_modules.
// Copying dist/server/ to Vercel without node_modules leaves every bare
// import unresolvable at runtime (ERR_MODULE_NOT_FOUND: h3-v2, etc.).
//
// Fix: write the adapter into dist/server/ so its relative imports resolve,
// then use the esbuild JS API to bundle everything — adapter + server.js +
// all externalized npm deps — into a single self-contained index.mjs.
// Node.js built-ins (node:*) remain external; they are always available.
const tmpEntry = "dist/server/_vercel_entry.mjs";
writeFileSync(
  tmpEntry,
  [
    "import worker from './server.js';",
    "export default async function handler(request) {",
    "  return worker.fetch(request, {}, { waitUntil: () => {}, passThroughOnException: () => {} });",
    "}",
  ].join("\n")
);

try {
  await build({
    entryPoints: [tmpEntry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: `${funcDir}/index.mjs`,
    alias: { crypto: "node:crypto" },
    external: ["node:*"],
  });
} finally {
  rmSync(tmpEntry, { force: true });
}

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.mjs", maxDuration: 30 })
);

// Routing: CDN-served static files first, then all other requests to SSR function
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
