// Shared helpers for reading responses that come back through the apiProxy
// Code Engine package (which may hand back a raw string, a { result } wrapper,
// an array, or an already-parsed object).

export function toValue(raw: unknown): unknown {
  let v: unknown = raw;
  for (let i = 0; i < 4; i++) {
    if (typeof v === 'string') {
      try {
        v = JSON.parse(v);
        continue;
      } catch {
        return v;
      }
    }
    if (v && typeof v === 'object' && 'result' in v) {
      const r: unknown = v.result;
      if (typeof r === 'string') {
        try {
          v = JSON.parse(r);
          continue;
        } catch {
          return r;
        }
      }
    }
    return v;
  }
  return v;
}

/** Deep-search for the first non-empty string at any `key` in a nested value. */
export function deepFind(v: unknown, key: string): string | null {
  if (Array.isArray(v)) {
    for (const x of v) {
      const f = deepFind(x, key);
      if (f) return f;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const direct = obj[key];
    if (typeof direct === 'string' && direct.trim()) return direct;
    for (const k of Object.keys(obj)) {
      const f = deepFind(obj[k], key);
      if (f) return f;
    }
  }
  return null;
}

export function preview(raw: unknown): string {
  try {
    return (typeof raw === 'string' ? raw : JSON.stringify(raw)).slice(0, 220);
  } catch {
    return String(raw).slice(0, 220);
  }
}
