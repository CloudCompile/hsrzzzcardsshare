"use client";

import { useCallback } from "react";
import { readStore, storeKey, useLocalStore, writeStore } from "./storage";
import type { Game } from "./types";

export interface SavedAccount {
  /** `<game>:<uid>`, the primary key everywhere else in the app. */
  id: string;
  game: Game;
  uid: string;
  nickname: string;
  savedAt: number;
  lastSeenAt: number;
}

export const ACCOUNTS_KEY = storeKey("accounts");
export const ACTIVE_ACCOUNT_KEY = storeKey("active-account");

export function accountId(game: Game, uid: string): string {
  return `${game}:${uid}`;
}

function isAccount(value: unknown): value is SavedAccount {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    (record.game === "zzz" || record.game === "hsr") &&
    typeof record.uid === "string" &&
    /^\d{8,10}$/.test(record.uid)
  );
}

export function listAccounts(): SavedAccount[] {
  return sanitizedAccounts();
}

function sanitizedAccounts(): SavedAccount[] {
  const raw = readStore<unknown>(ACCOUNTS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAccount).map((account) => ({
    ...account,
    nickname: typeof account.nickname === "string" ? account.nickname : "",
    savedAt: Number(account.savedAt) || Date.now(),
    lastSeenAt: Number(account.lastSeenAt) || Number(account.savedAt) || Date.now(),
  }));
}

export function saveAccount(game: Game, uid: string, nickname = ""): SavedAccount {
  const id = accountId(game, uid);
  const now = Date.now();
  const accounts = sanitizedAccounts();
  const existing = accounts.find((account) => account.id === id);
  const next: SavedAccount = existing
    ? {
        ...existing,
        nickname: nickname || existing.nickname,
        lastSeenAt: now,
      }
    : { id, game, uid, nickname, savedAt: now, lastSeenAt: now };

  writeStore(
    ACCOUNTS_KEY,
    existing
      ? accounts.map((account) => (account.id === id ? next : account))
      : [next, ...accounts].slice(0, 24),
  );
  writeStore(ACTIVE_ACCOUNT_KEY, id);
  return next;
}

export function removeAccount(id: string): void {
  writeStore(
    ACCOUNTS_KEY,
    sanitizedAccounts().filter((account) => account.id !== id),
  );
  if (readStore<string | null>(ACTIVE_ACCOUNT_KEY, null) === id) {
    writeStore(ACTIVE_ACCOUNT_KEY, null);
  }
}

export function setActiveAccount(id: string | null): void {
  writeStore(ACTIVE_ACCOUNT_KEY, id);
}

/** Records the nickname/last-seen time, but never adds an account the user didn't save. */
export function touchAccount(id: string, patch: Partial<Pick<SavedAccount, "nickname">>): void {
  const accounts = sanitizedAccounts();
  const existing = accounts.find((account) => account.id === id);
  if (!existing) return;
  const next = {
    ...existing,
    nickname: patch.nickname || existing.nickname,
    lastSeenAt: Date.now(),
  };
  writeStore(
    ACCOUNTS_KEY,
    accounts.map((account) => (account.id === id ? next : account)),
  );
}

export function useAccounts() {
  const [accounts, setAccounts] = useLocalStore<SavedAccount[]>(ACCOUNTS_KEY, []);
  const [activeId, setActiveId, hydrated] = useLocalStore<string | null>(ACTIVE_ACCOUNT_KEY, null);

  const save = useCallback((game: Game, uid: string, nickname?: string) => {
    saveAccount(game, uid, nickname);
  }, []);

  const remove = useCallback((id: string) => {
    removeAccount(id);
  }, []);

  const activate = useCallback((id: string | null) => {
    setActiveAccount(id);
  }, []);

  const valid = accounts.filter(isAccount);
  const active = valid.find((account) => account.id === activeId) ?? null;

  // `setAccounts` is unused directly: writes go through saveAccount/removeAccount so the
  // storage event keeps every mounted list in sync.
  void setAccounts;

  return { accounts: valid, active, activeId: active?.id ?? activeId, save, remove, activate, hydrated };
}
