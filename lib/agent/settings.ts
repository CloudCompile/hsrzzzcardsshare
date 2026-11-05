"use client";

import { useCallback } from "react";
import { storeKey, useLocalStore } from "@/lib/storage";
import type { Game } from "@/lib/types";

export interface AgentSettings {
  baseUrl: string;
  model: string;
  stream: boolean;
  /** Route requests through /api/agent/relay when a provider blocks browser CORS. */
  viaRelay: boolean;
  /** Keep the key across restarts; off means it only lives for this tab. */
  rememberKey: boolean;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "",
  stream: true,
  viaRelay: false,
  rememberKey: true,
};

/** ZZZ and HSR are configured as separate agents, so each gets its own settings. */
export function settingsKey(game: Game): string {
  return storeKey(`agent:settings:${game}`);
}

export function apiKeyKey(game: Game): string {
  return storeKey(`agent:key:${game}`);
}

function session(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readApiKey(game: Game): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(apiKeyKey(game)) ??
      session()?.getItem(apiKeyKey(game)) ??
      ""
    );
  } catch {
    return "";
  }
}

export function writeApiKey(game: Game, value: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  const local = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })();
  try {
    // Always drop the other store so a "this tab only" key can't linger.
    (remember ? session() : local)?.removeItem(apiKeyKey(game));
    (remember ? local : session())?.setItem(apiKeyKey(game), value);
  } catch {
    // Storage can be full or blocked; the key just won't persist.
  }
}

export function useAgentSettings(game: Game) {
  const [settings, setSettings] = useLocalStore<AgentSettings>(settingsKey(game), DEFAULT_SETTINGS);
  const setKey = useCallback(
    (value: string) => {
      writeApiKey(game, value, settings.rememberKey);
    },
    [game, settings.rememberKey],
  );

  return { settings: { ...DEFAULT_SETTINGS, ...settings }, setSettings, setKey };
}

/** Appends `/chat/completions` unless the user already pasted a full endpoint. */
export function chatEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function modelsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /\/models$/.test(trimmed) ? trimmed : `${trimmed}/models`;
}
