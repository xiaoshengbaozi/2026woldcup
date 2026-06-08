type CacheRecord<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

type CacheOptions = {
  persist?: boolean;
  staleTtlMs?: number;
};

type PersistedRecord<T> = {
  savedAt: number;
  value: T;
};

const cache = new Map<string, CacheRecord<unknown>>();

export async function cachedJson<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, options?: CacheOptions) {
  return cachedValue<T>(`json:${key}`, ttlMs, fetcher, options);
}

export async function cachedText(key: string, ttlMs: number, fetcher: () => Promise<string>, options?: CacheOptions) {
  return cachedValue<string>(`text:${key}`, ttlMs, fetcher, options);
}

export function clearRequestCache(pattern?: string | RegExp) {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (typeof pattern === "string" ? key.includes(pattern) : pattern.test(key)) {
      cache.delete(key);
    }
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: mergeSignals(init.signal, controller.signal),
    });
  } finally {
    clearTimeout(timeout);
  }
}

function mergeSignals(primary: AbortSignal | null | undefined, timeoutSignal: AbortSignal) {
  if (!primary) return timeoutSignal;
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
    return AbortSignal.any([primary, timeoutSignal]);
  }
  return primary.aborted ? primary : timeoutSignal;
}

async function cachedValue<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, options: CacheOptions = {}) {
  const now = Date.now();
  const current = cache.get(key) as CacheRecord<T> | undefined;

  if (current?.value !== undefined && current.expiresAt > now) {
    return current.value;
  }

  if (options.persist && current?.value !== undefined) {
    void refreshWithStaleFallback(key, ttlMs, current.value, fetcher, options);
    return current.value;
  }

  const persisted = options.persist ? readPersistedValue<T>(key, options.staleTtlMs) : undefined;
  if (persisted !== undefined) {
    cache.set(key, { value: persisted, expiresAt: now + ttlMs });
    void refreshWithStaleFallback(key, ttlMs, persisted, fetcher, options);
    return persisted;
  }

  if (current?.promise) {
    return current.promise;
  }

  const promise = fetcher().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (options.persist) writePersistedValue(key, value);
    return value;
  }).catch((error) => {
    if (current?.value !== undefined) {
      cache.set(key, { value: current.value, expiresAt: Date.now() + ttlMs });
      return current.value;
    }
    const fallback = options.persist ? readPersistedValue<T>(key, options.staleTtlMs) : undefined;
    if (fallback !== undefined) {
      cache.set(key, { value: fallback, expiresAt: Date.now() + ttlMs });
      return fallback;
    }
    cache.delete(key);
    throw error;
  });

  cache.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

async function refreshWithStaleFallback<T>(
  key: string,
  ttlMs: number,
  staleValue: T,
  fetcher: () => Promise<T>,
  options: CacheOptions
) {
  const current = cache.get(key) as CacheRecord<T> | undefined;
  if (current?.promise) return current.promise;

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      if (options.persist) writePersistedValue(key, value);
      return value;
    })
    .catch(() => {
      cache.set(key, { value: staleValue, expiresAt: Date.now() + ttlMs });
      return staleValue;
    });

  cache.set(key, { value: staleValue, promise, expiresAt: Date.now() + ttlMs });
  return promise;
}

function readPersistedValue<T>(key: string, staleTtlMs = 24 * 60 * 60 * 1000) {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(getStorageKey(key));
    if (!raw) return undefined;
    const record = JSON.parse(raw) as PersistedRecord<T>;
    if (!record || Date.now() - record.savedAt > staleTtlMs) return undefined;
    return record.value;
  } catch {
    return undefined;
  }
}

function writePersistedValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(key), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be full or unavailable in private browsing; memory cache still works.
  }
}

function getStorageKey(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return `wc-request-cache:${hash.toString(36)}`;
}
