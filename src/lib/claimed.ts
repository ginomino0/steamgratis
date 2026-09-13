import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "steamgratis.claimed.v1";
const EVENT = "steamgratis-claimed";
const EMPTY: string[] = [];

let cacheKey = "";
let cache: string[] = EMPTY;

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getSnapshot(): string[] {
  const raw = readRaw();
  if (raw === cacheKey) return cache;
  cacheKey = raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    cache = Array.isArray(parsed) ? parsed.map(String) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function write(ids: string[]) {
  const next = JSON.stringify(ids);
  localStorage.setItem(KEY, next);
  cacheKey = next;
  cache = ids;
  window.dispatchEvent(new Event(EVENT));
}

export function useClaimed() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useMemo(() => new Set(ids), [ids]);

  const toggle = useCallback((id: string) => {
    const current = new Set(getSnapshot());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    write(Array.from(current));
  }, []);

  const has = useCallback((id: string) => set.has(id), [set]);

  return { claimed: set, toggle, has, count: set.size };
}
