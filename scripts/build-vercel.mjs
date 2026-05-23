import { cpSync, mkdirSync, writeFileSync, rmSync } from "node:fs";

rmSync(".vercel/output", { recursive: true, force: true });

// Static assets served by Vercel CDN (JS chunks, CSS, images)
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist/client", ".vercel/output/static", { recursive: true });

// SSR Edge Function — dist/server exports default { fetch(req,env,ctx) }
const funcDir = ".vercel/output/functions/index.func";
mkdirSync(funcDir, { recursive: true });
cpSync("dist/server", funcDir, { recursive: true });

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({ runtime: "edge", entrypoint: "server.js" })
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
