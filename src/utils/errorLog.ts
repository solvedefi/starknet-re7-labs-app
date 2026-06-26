// Lightweight de-duplicating error logger.
//
// Repeated identical failures — e.g. an indexer endpoint returning 400 on every
// poll — would otherwise flood the console with the same stack trace dozens of
// times. This throttles each distinct error `key` to at most one log per window,
// so a persistently-failing endpoint is reported once, not on every retry/render.
const lastLogged = new Map<string, number>();
const DEFAULT_WINDOW_MS = 30_000;

export function logErrorOnce(key: string, ...args: unknown[]) {
  const now = Date.now();
  const prev = lastLogged.get(key);
  if (prev !== undefined && now - prev < DEFAULT_WINDOW_MS) return;
  lastLogged.set(key, now);
  console.error(...args);
}
