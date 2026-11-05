"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Everything Astra keeps locally is namespaced so a clear-out is a prefix delete. */
export const STORE_PREFIX = "astra:v1:";

const STORE_EVENT = "astra:store";

export function storeKey(path: string): string {
  return `${STORE_PREFIX}${path}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Safari in private mode and embedded webviews can throw on access.
    return null;
  }
}

export function readStore<T>(key: string, fallback: T): T {
  const box = storage();
  if (!box) return fallback;
  try {
    const raw = box.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function announce(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(STORE_EVENT, { detail: key }));
}

export function writeStore<T>(key: string, value: T): void {
  const box = storage();
  if (!box) return;
  try {
    box.setItem(key, JSON.stringify(value));
  } catch {
    // Quota errors shouldn't take a page down; the write is simply lost.
    return;
  }
  announce(key);
}

export function removeStore(key: string): void {
  const box = storage();
  if (!box) return;
  try {
    box.removeItem(key);
  } catch {
    return;
  }
  announce(key);
}

export function listStoreKeys(prefix: string): string[] {
  const box = storage();
  if (!box) return [];
  const keys: string[] = [];
  for (let index = 0; index < box.length; index += 1) {
    const key = box.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

/** Fires for this-tab writes and for other-tab `storage` events. */
export function subscribeStore(key: string, listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<string>).detail === key) listener();
  };
  const onOther = (event: StorageEvent) => {
    if (event.key === key) listener();
  };
  window.addEventListener(STORE_EVENT, onLocal);
  window.addEventListener("storage", onOther);
  return () => {
    window.removeEventListener(STORE_EVENT, onLocal);
    window.removeEventListener("storage", onOther);
  };
}

/** Fires for any Astra write, used by lists that span several keys (manual drafts). */
export function subscribeAll(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = (event: Event) => {
    const key = (event as CustomEvent<string>).detail;
    if (key?.startsWith(STORE_PREFIX)) listener();
  };
  window.addEventListener(STORE_EVENT, onLocal);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STORE_EVENT, onLocal);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Reads a JSON value from localStorage after mount, so server and client render the
 * same first paint. `hydrated` is false until the stored value has been applied.
 */
export function useLocalStore<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((current: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    const read = () => setValue(readStore(key, fallbackRef.current));
    read();
    setHydrated(true);
    return subscribeStore(key, read);
  }, [key]);

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === "function" ? (next as (current: T) => T)(current) : next;
        writeStore(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set, hydrated];
}
