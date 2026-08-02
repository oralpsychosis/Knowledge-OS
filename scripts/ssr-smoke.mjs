import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const entryPath = resolve(".output/server/index.mjs");

try {
  await access(entryPath);
} catch {
  throw new Error(
    "Missing .output/server/index.mjs. Run `npm run build` before `npm run smoke:ssr`.",
  );
}

const serverModule = await import(pathToFileURL(entryPath).href);
const handler = serverModule.default;

if (!handler || typeof handler.fetch !== "function") {
  throw new Error("The generated Nitro server entry does not export a fetch handler.");
}

const response = await handler.fetch(new Request("http://localhost/"), {}, { waitUntil() {} });
const body = await response.text();

if (response.status !== 200) {
  throw new Error(`SSR smoke request returned ${response.status}.\n${body.slice(0, 500)}`);
}

if (!body.includes("Knowledge OS")) {
  throw new Error("SSR smoke request returned HTML without the Knowledge OS shell.");
}

console.log("SSR smoke passed: GET / returned 200 with the Knowledge OS shell.");
