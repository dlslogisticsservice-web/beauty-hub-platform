import { cpSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
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
//
// We also attach a 27 s AbortSignal to the request so that if React's
// renderToReadableStream or any upstream await never resolves, the signal fires
// and worker.fetch rejects well before Vercel's 30 s hard Lambda timeout.
// The errorMiddleware in src/start.ts catches the AbortError and returns a
// 500 HTML response, so Vercel always receives a completed Response object.
writeFileSync(
  tmpEntry,
  `import worker from './server.js';

function toAbsoluteUrl(request) {
  try {
    new URL(request.url);
    return request.url;
  } catch {}
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    (process.env.VERCEL_URL ?? 'localhost:3000');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return new URL(request.url || '/', \`\${proto}://\${host}\`).href;
}

export default async function handler(request) {
  const t0 = Date.now();
  console.log('[SSR] handler start', request.method, request.url);

  const url = toAbsoluteUrl(request);
  const reqWithAbsUrl = url === request.url ? request : new Request(url, request);

  // 27 s abort so renderToReadableStream is cancelled before Vercel's 30 s limit.
  const abort = new AbortController();
  const abortTimer = setTimeout(() => {
    console.log('[SSR] 27 s abort fired — cancelling request');
    abort.abort('SSR timeout: render did not complete within 27 s');
  }, 27000);

  // Merge the original signal (if any) with our 27 s budget.
  if (reqWithAbsUrl.signal?.aborted) {
    clearTimeout(abortTimer);
    abort.abort(reqWithAbsUrl.signal.reason);
  } else {
    reqWithAbsUrl.signal?.addEventListener('abort', () => {
      clearTimeout(abortTimer);
      abort.abort(reqWithAbsUrl.signal.reason);
    }, { once: true });
  }

  const hasBody = reqWithAbsUrl.method !== 'GET' && reqWithAbsUrl.method !== 'HEAD' && reqWithAbsUrl.body != null;
  const reqInit = { method: reqWithAbsUrl.method, headers: reqWithAbsUrl.headers, signal: abort.signal };
  if (hasBody) { reqInit.body = reqWithAbsUrl.body; reqInit.duplex = 'half'; }
  const req = new Request(reqWithAbsUrl.url, reqInit);

  try {
    console.log('[SSR] calling worker.fetch');
    const response = await worker.fetch(req, {}, { waitUntil: () => {}, passThroughOnException: () => {} });
    console.log('[SSR] worker.fetch resolved in', Date.now() - t0, 'ms, status', response.status);
    return response;
  } finally {
    clearTimeout(abortTimer);
  }
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

// ─── Post-build bundle patches ────────────────────────────────────────────────
// transformStreamWithRouter has two 60 s safety timeouts. Both exceed Vercel's
// 30 s Lambda limit, so the stream errors (via safeError) only after Vercel has
// already killed the function. Patch them to:
//   • serialisation timeout: 20 s — fires if serialisation stalls after render
//   • lifetime timeout: 25 s — absolute ceiling, gives 5 s before Vercel's limit
// Also replace safeError() with safeClose() in both handlers: closing the stream
// gracefully lets Vercel send whatever HTML was rendered rather than surfacing a
// network error to the browser. React will hydrate from the partial HTML and
// re-fetch any missing data client-side.
const bundlePath = `${funcDir}/index.mjs`;
let bundle = readFileSync(bundlePath, "utf-8");

const patched1 = bundle.replace("var DEFAULT_SERIALIZATION_TIMEOUT_MS = 6e4;", "var DEFAULT_SERIALIZATION_TIMEOUT_MS = 20e3;");
const patched2 = patched1.replace("var DEFAULT_LIFETIME_TIMEOUT_MS = 6e4;", "var DEFAULT_LIFETIME_TIMEOUT_MS = 25e3;");
// Replace safeError() calls in both timeout handlers with safeClose().
// We match the error-message strings to be surgical: only the two timeout
// handlers use these exact messages, so the replacements are safe regardless
// of surrounding whitespace or comment presence in the esbuild output.
const patched3 = patched2.replace(
  /safeError\(\s*(?:\/\*[^*]*\*\/)?\s*new Error\("Stream lifetime exceeded"\)\s*\)/g,
  "safeClose()"
);
const patched4 = patched3.replace(
  /safeError\(\s*(?:\/\*[^*]*\*\/)?\s*new Error\("Serialization timeout after app render finished"\)\s*\)/g,
  "safeClose()"
);

if (patched1 === bundle)   console.warn("[build-vercel] WARNING: DEFAULT_SERIALIZATION_TIMEOUT_MS patch did not apply");
if (patched2 === patched1) console.warn("[build-vercel] WARNING: DEFAULT_LIFETIME_TIMEOUT_MS patch did not apply");
if (patched3 === patched2) console.warn("[build-vercel] WARNING: safeError(Stream lifetime exceeded) patch did not apply");
if (patched4 === patched3) console.warn("[build-vercel] WARNING: safeError(Serialization timeout) patch did not apply");

bundle = patched4;

writeFileSync(bundlePath, bundle);
console.log("[build-vercel] Bundle timeout patches applied.");
// ──────────────────────────────────────────────────────────────────────────────

// supportsResponseStreaming: true is required for Vercel's Node.js Lambda
// adapter to handle a ReadableStream response body. Without it the adapter
// tries to buffer the entire response synchronously — which hangs if the
// stream doesn't close immediately — and the function times out at 30 s.
writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.mjs",
    maxDuration: 30,
    supportsResponseStreaming: true,
  })
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
