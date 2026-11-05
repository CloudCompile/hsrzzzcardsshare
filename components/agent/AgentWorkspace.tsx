"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { accountId, saveAccount, useAccounts } from "@/lib/accounts";
import { AgentError, agentTurn, type WireMessage } from "@/lib/agent/client";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { readApiKey, useAgentSettings, writeApiKey } from "@/lib/agent/settings";
import {
  AGENT_TOOLS,
  TOOL_LABELS,
  runTool,
  type AgentCatalog,
  type ToolContext,
} from "@/lib/agent/tools";
import { useManualDrafts } from "@/lib/manualDrafts";
import { GAMES } from "@/lib/site";
import { storeKey, useLocalStore } from "@/lib/storage";
import type { Game, ShowcaseProfile } from "@/lib/types";
import { AgentChat, type ChatItem } from "./AgentChat";
import { AgentConfig } from "./AgentConfig";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function AgentWorkspace({
  initialGame,
  initialUid,
  initialFocus,
}: {
  initialGame: Game;
  initialUid: string;
  initialFocus: string;
}) {
  const { accounts, active, hydrated } = useAccounts();
  const [game, setGame] = useState<Game>(initialGame);
  const [uid, setUid] = useState(initialUid);
  const [profile, setProfile] = useState<ShowcaseProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [seed, setSeed] = useState<{ text: string; token: number } | undefined>();
  const controllerRef = useRef<AbortController | null>(null);

  const { settings, setSettings } = useAgentSettings(game);
  const { drafts } = useManualDrafts(game);
  const chatKey = storeKey(`agent:chat:${game}:${uid || "none"}`);
  const [messages, setMessages, chatHydrated] = useLocalStore<ChatItem[]>(chatKey, []);

  // Fall back to the active (or first) saved account for this game.
  useEffect(() => {
    if (uid) return;
    const pool = accounts.filter((account) => account.game === game);
    const fallback = (active && active.game === game ? active : null) ?? pool[0];
    if (fallback) setUid(fallback.uid);
  }, [accounts, active, game, uid]);

  useEffect(() => {
    setApiKeyState(readApiKey(game));
  }, [game]);

  // Drop half-finished streams left over from a previous visit.
  useEffect(() => {
    if (!chatHydrated) return;
    setMessages((current) =>
      current.some((item) => item.pending)
        ? current.map((item) => ({ ...item, pending: false }))
        : current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHydrated, chatKey]);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setLoadError("");
    fetch(`/api/showcase/${game}/${uid}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          profile?: ShowcaseProfile;
          message?: string;
        };
        if (!response.ok || !data.ok || !data.profile) {
          throw new Error(data.message || "Couldn't load that showcase.");
        }
        setProfile(data.profile);
        setStatus("ready");
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setProfile(null);
        setLoadError(error.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [game, uid, reloadKey]);

  useEffect(() => {
    if (!settingsOpen && !accountOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [accountOpen, settingsOpen]);

  const toolContext = useMemo<ToolContext | null>(() => {
    if (!profile) return null;
    return {
      game,
      profile,
      drafts,
      loadCatalog: async (): Promise<AgentCatalog> => {
        const response = await fetch(`/api/agent/catalog/${game}`);
        const data = (await response.json()) as Partial<AgentCatalog>;
        return {
          agents: data.agents ?? [],
          sets: data.sets ?? [],
          weapons: data.weapons ?? [],
        };
      },
    };
  }, [drafts, game, profile]);

  const updateSettings = useCallback(
    (patch: Partial<typeof settings>) => {
      setSettings((current) => ({ ...current, ...patch }));
      if (patch.rememberKey !== undefined) {
        // Move the key between local and session storage when the toggle flips.
        writeApiKey(game, apiKey, patch.rememberKey);
      }
    },
    [apiKey, game, setSettings],
  );

  const updateKey = useCallback(
    (value: string) => {
      setApiKeyState(value);
      writeApiKey(game, value, settings.rememberKey);
    },
    [game, settings.rememberKey],
  );

  const send = useCallback(
    async ({ text, mentions }: { text: string; mentions: string[] }) => {
      if (!toolContext || busy) return;

      const history: WireMessage[] = messages
        .filter((item) => !item.pending && item.content.trim())
        .slice(-20)
        .map((item) => ({ role: item.role, content: item.content }));

      const assistantId = uuid();
      const focus = mentions.length ? `\n\n(focus: ${mentions.join(", ")})` : "";

      setMessages((current) => [
        ...current.filter((item) => !item.pending).slice(-59),
        { id: uuid(), role: "user", content: text },
        { id: assistantId, role: "assistant", content: "", tools: [], pending: true },
      ]);

      setBusy(true);
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const result = await agentTurn({
          settings,
          apiKey,
          system: buildSystemPrompt({ game, profile: toolContext.profile, drafts }),
          history: [...history, { role: "user", content: `${text}${focus}` }],
          tools: AGENT_TOOLS,
          execute: (name, args) => runTool(name, args, toolContext),
          signal: controller.signal,
          onDelta: (chunk) =>
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: item.content + chunk } : item,
              ),
            ),
          onTool: (name) =>
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? { ...item, tools: [...(item.tools ?? []), TOOL_LABELS[name] ?? name] }
                  : item,
              ),
            ),
        });

        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  pending: false,
                  content:
                    item.content ||
                    result.text ||
                    (result.stopped
                      ? "(stopped)"
                      : "The model finished without a reply — try rephrasing."),
                }
              : item,
          ),
        );
      } catch (error) {
        const agentError = error instanceof AgentError ? error : null;
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  pending: false,
                  error: agentError?.message ?? "Something went wrong talking to the provider.",
                  hint: agentError?.hint ?? "Check the provider settings.",
                }
              : item,
          ),
        );
      } finally {
        controllerRef.current = null;
        setBusy(false);
      }
    },
    [apiKey, busy, drafts, game, messages, setMessages, settings, toolContext],
  );

  const roster =
    toolContext?.profile.characters.map((character) => ({
      id: character.id,
      name: character.name,
    })) ?? [];
  const focusName = roster.find((entry) => entry.id === initialFocus)?.name;
  const initialText = focusName ? `Tell me about @${focusName}` : "";
  const configured = Boolean(settings.model.trim() && apiKey.trim());
  const currentSaved = accounts.some((account) => account.id === accountId(game, uid));
  const current = accounts.find((account) => account.id === accountId(game, uid));
  const gameAccounts = accounts.filter((account) => account.game === game);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-white/[0.06] bg-[#07070c]/70 backdrop-blur">
        <div className="shell flex flex-wrap items-center gap-2 py-2.5">
          <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
            {(Object.keys(GAMES) as Game[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGame(key);
                  setUid("");
                  setProfile(null);
                }}
                className={`rounded-md px-2.5 py-1 font-display text-[11px] tracking-[0.04em] transition-colors ${
                  game === key ? "bg-white/10 text-white" : "text-muted hover:text-white"
                }`}
              >
                {GAMES[key].short}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              className="flex h-9 max-w-[240px] items-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-black/30 pl-1.5 pr-2 transition-colors hover:border-white/25"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] font-display text-[10px] text-white/80">
                {(profile?.player.nickname || `U${uid}`).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[11px] leading-[1.25] text-white/90">
                  {profile?.player.nickname || (uid ? `UID ${uid}` : "No account")}
                </span>
                <span className="block truncate text-[9px] leading-[1.3] text-faint">
                  {status === "loading"
                    ? "loading…"
                    : profile
                      ? `${profile.characters.length} on showcase${currentSaved ? "" : " · not saved"}`
                      : "pick an account"}
                </span>
              </span>
              <Chevron />
            </button>

            {accountOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close account menu"
                  onClick={() => setAccountOpen(false)}
                  className="fixed inset-0 z-20 cursor-default"
                />
                <div className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-white/10 bg-[#0b0b13] p-1.5 shadow-2xl">
                  <p className="px-2 py-1 text-[9.5px] uppercase tracking-[0.14em] text-faint">
                    {GAMES[game].short} accounts
                  </p>
                  {gameAccounts.length ? (
                    gameAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setUid(account.uid);
                          setAccountOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition-colors ${
                          account.uid === uid
                            ? "bg-white/[0.08] text-white"
                            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {account.nickname || `UID ${account.uid}`}
                        </span>
                        <span className="num text-[9.5px] text-faint">{account.uid}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-[10.5px] text-faint">Nothing saved yet.</p>
                  )}

                  <div className="my-1 h-px bg-white/[0.07]" />

                  {uid && !currentSaved ? (
                    <button
                      type="button"
                      onClick={() => {
                        saveAccount(game, uid, profile?.player.nickname ?? "");
                        setAccountOpen(false);
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-left text-[11.5px] text-[#7cf5d0] transition-colors hover:bg-white/[0.05]"
                    >
                      Save this account
                    </button>
                  ) : null}
                  <Link
                    href="/"
                    className="block rounded-md px-2 py-1.5 text-[11.5px] text-muted transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Add another UID
                  </Link>
                </div>
              </>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/80 transition-colors hover:border-white/25"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-[#7cf5d0]" : "bg-[#ffd977]"}`}
              />
              <span className="max-w-[170px] truncate">
                {configured ? settings.model : "Set up provider"}
              </span>
              <Gear />
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              disabled={!messages.length || busy}
              className="btn btn-ghost px-2.5 py-1.5 text-[11px] disabled:opacity-40"
            >
              New chat
            </button>
          </div>
        </div>
      </header>

      <AgentChat
        key={chatKey}
        messages={messages}
        roster={roster}
        busy={busy}
        model={configured ? settings.model : ""}
        disabled={!toolContext}
        disabledReason={
          status === "loading"
            ? "Loading your showcase…"
            : status === "error"
              ? loadError
              : "Pick an account to start."
        }
        initialText={initialText}
        seed={seed}
        onSeed={(text) => setSeed({ text, token: Date.now() })}
        onSend={send}
        onStop={() => controllerRef.current?.abort()}
        onClear={() => setMessages([])}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="relative flex h-full w-full max-w-[420px] animate-fade-up flex-col overflow-y-auto border-l border-white/10 bg-[#08080f]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <p className="label">Agent settings</p>
                <p className="mt-0.5 text-[10.5px] text-faint">
                  {GAMES[game].short} · stored in this browser
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="btn btn-ghost h-7 w-7 p-0 text-[12px]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-4">
              <AgentConfig
                game={game}
                settings={settings}
                onChange={updateSettings}
                apiKey={apiKey}
                onKeyChange={updateKey}
              />
            </div>

            <div className="mt-auto space-y-3 border-t border-white/[0.07] px-4 py-4">
              <div>
                <p className="label">Context</p>
                {profile ? (
                  <>
                    <p className="mt-1.5 text-[11.5px] text-white/85">
                      {profile.player.nickname} · UID {profile.player.uid}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {profile.characters.map((character) => (
                        <span
                          key={character.id}
                          className="rounded-sm border border-white/[0.07] bg-black/40 px-1.5 py-0.5 text-[10px] text-white/60"
                        >
                          {character.name}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReloadKey((value) => value + 1)}
                      className="btn btn-ghost mt-2 w-full px-3 py-1.5 text-[10.5px]"
                    >
                      Refresh showcase
                    </button>
                  </>
                ) : (
                  <p className="mt-1.5 text-[10.5px] text-faint">
                    {status === "error" ? loadError : "No showcase loaded yet."}
                  </p>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-faint">
                The agent only sees what this browser can see: your public showcase and manual builds
                saved here. Requests go straight to your provider — Astra never sees your key. The
                relay is a pass-through you only need when a provider blocks browser calls. ZZZ and
                HSR keep separate settings and chats.
              </p>
              {hydrated ? null : <p className="text-[10px] text-faint">Loading saved accounts…</p>}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="text-white/35"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Gear() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="text-white/40"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
