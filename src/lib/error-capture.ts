// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : String(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, 8000);
}

// Ensure global listeners are ONLY added in the browser and use generic event types
// to avoid ReferenceErrors on types that don't exist in Node.js environments.
if (typeof window !== "undefined") {
  window.addEventListener("error", (event: any) => record(event.error ?? event));
  window.addEventListener("unhandledrejection", (event: any) => record(event.reason));
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}