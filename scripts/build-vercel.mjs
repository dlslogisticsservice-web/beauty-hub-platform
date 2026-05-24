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
// Vercel's Node.js runtime may deliver the request with a path-only URL such
// as "/" instead of "https://example.vercel.app/". h3/srvx calls new URL(req.url)
// which requires an absolute URL — a relative one throws "Invalid URL".
// We normalise at this adapter boundary so the rest of the stack never sees a
// relative URL regardless of how Vercel constructs the Request object.
writeFileSync(
  tmpEntry,
  `import worker from './server.js';

function toAbsoluteUrl(request) {
  try {
    // Fast path: already absolute (most Vercel runtimes do this correctly).
    new URL(request.url);
    return request.url;
  } catch {}
  // Reconstruct from the request headers. Vercel always sets 'host'.
  // x-forwarded-proto carries the external scheme even when the lambda
  // itself is reached via http internally.
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    (process.env.VERCEL_URL ?? 'localhost:3000');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return new URL(request.url || '/', \`\${proto}://\${host}\`).href;
}

export default async function handler(request) {
  const url = toAbsoluteUrl(request);
  const req = url === request.url ? request : new Request(url, request);
  return worker.fetch(req, {}, { waitUntil: () => {}, passThroughOnException: () => {} });
}
`
);

// Node.js built-in modules without the "node:" prefix are aliased so esbuild
// treats them as the same external as their "node:*" counterparts.
// This covers packages that call require("util"), require("fs"), etc. directly.
const nodeBuiltins = [
  "assert", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "dns", "domain", "events", "fs", "http", "http2",
  "https", "module", "net", "os", "path", "perf_hooks", "process",
  "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
  "sys", "timers", "tls", "trace_events", "tty", "url", "util", "v8",
  "vm", "worker_threads", "zlib",
];
const builtinAlias = Object.fromEntries(
  nodeBuiltins.map((m) => [m, `node:${m}`])
);

try {
  await build({
    entryPoints: [tmpEntry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: `${funcDir}/index.mjs`,
    // Remap bare built-in names → node: namespace so they resolve as externals.
    alias: builtinAlias,
    // Keep every node: built-in external (available in the Lambda runtime).
    external: ["node:*"],
    // h3-v2, @tanstack/*, @supabase/* and local server chunks each declare
    // "sideEffects": false in their own package.json files. The CF Workers
    // server build emits bare `import "h3-v2"` calls for side-effect-only
    // initialization. Without this flag esbuild honors those annotations and
    // silently drops those imports, breaking SSR route and middleware setup.
    ignoreAnnotations: true,
    // esbuild wraps bundled CJS modules with a __require() helper that checks
    // `typeof require !== "undefined"`. Node 20 ESM does not expose require,
    // so we inject it via createRequire once at the top of the output file.
    // This is the supported esbuild JS-API banner option, not a CLI workaround.
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
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
