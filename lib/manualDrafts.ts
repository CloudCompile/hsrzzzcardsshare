"use client";

import { useCallback, useEffect, useState } from "react";
import { listStoreKeys, readStore, removeStore, storeKey, subscribeAll, writeStore } from "./storage";
import { decodeBuild, encodeBuild, type ManualBuild } from "./manualCodec";
import type { Game } from "./types";

export interface ManualDraft {
  game: Game;
  charId: string;
  name: string;
  build: ManualBuild;
  updatedAt: number;
}

const DRAFT_PREFIX = storeKey("manual-draft:");

export function draftKey(game: Game, charId: string): string {
  return `${DRAFT_PREFIX}${game}:${charId}`;
}

function isDraft(value: unknown, game: Game): value is ManualDraft {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.game === game &&
    typeof record.charId === "string" &&
    typeof record.name === "string" &&
    typeof record.build === "object" &&
    record.build !== null
  );
}

export function listManualDrafts(game: Game): ManualDraft[] {
  return listStoreKeys(`${DRAFT_PREFIX}${game}:`)
    .map((key) => readStore<unknown>(key, null))
    .filter((value): value is ManualDraft => isDraft(value, game))
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

export function saveManualDraft(draft: Omit<ManualDraft, "updatedAt">): void {
  const record: ManualDraft = { ...draft, updatedAt: Date.now() };
  writeStore(draftKey(draft.game, draft.charId), record);
}

export function removeManualDraft(game: Game, charId: string): void {
  removeStore(draftKey(game, charId));
}

export function renameManualDraft(game: Game, charId: string, name: string): void {
  const key = draftKey(game, charId);
  const stored = readStore<ManualDraft | null>(key, null);
  if (!stored) return;
  writeStore(key, { ...stored, name: name.slice(0, 60) || stored.name });
}

/** A stored draft, repaired through the same decoder shared links use. */
export function draftBuild(draft: ManualDraft): ManualBuild {
  return decodeBuild(encodeBuild(draft.build), {
    game: draft.game,
    char: draft.charId,
    level: draft.build?.level ?? (draft.game === "zzz" ? 60 : 80),
  });
}

export function useManualDrafts(game: Game) {
  const [drafts, setDrafts] = useState<ManualDraft[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setDrafts(listManualDrafts(game));
    refresh();
    setHydrated(true);
    return subscribeAll(refresh);
  }, [game]);

  const remove = useCallback(
    (charId: string) => {
      removeManualDraft(game, charId);
    },
    [game],
  );

  const rename = useCallback(
    (charId: string, name: string) => {
      renameManualDraft(game, charId, name);
    },
    [game],
  );

  return { drafts, remove, rename, hydrated };
}
