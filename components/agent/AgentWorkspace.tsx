"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccounts } from "@/lib/accounts";
import { AgentError, agentTurn, type WireMessage } from "@/lib/agent/client";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { readApiKey, useAgentSettings, writeApiKey } from "@/lib/agent/settings";
import { AGENT_TOOLS, TOOL_LABELS, runTool, type AgentCatalog, type ToolContext } from "@/lib/agent/tools";
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
                  hint: agentError?.hint ?? "Check the provider settings on the left.",
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

  const gameAccounts = accounts.filter((account) => account.game === game);
  const roster = toolContext?.profile.characters.map((character) => ({
    id: character.id,
    name: character.name,
  })) ?? [];
  const focusName = roster.find((entry) => entry.id === initialFocus)?.name;
  const initialText = focusName ? `Tell me about @${focusName}` : "";

  return (
    <div className="shell py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Build agent</p>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            Ask about your builds.
          </h1>
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
            Your own model, reading your own showcase. It can look up any pinned character, compare a
            lineup and search the game&apos;s discs and engines — then tell you what to fix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
            {(Object.keys(GAMES) as Game[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGame(key);
                  setUid("");
                  setProfile(null);
                }}
                className={`btn px-3 py-1.5 text-[11.5px] ${
                  game === key ? "bg-white/10 text-white" : "text-muted hover:text-white"
                }`}
              >
                {GAMES[key].short}
              </button>
            ))}
          </div>

          {gameAccounts.length ? (
            <select
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              aria-label="Account"
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11.5px] text-white/80 outline-none focus:border-white/25"
            >
              {gameAccounts.map((account) => (
                <option key={account.id} value={account.uid}>
                  {account.nickname || `UID ${account.uid}`}
                </option>
              ))}
            </select>
          ) : (
            <Link href="/" className="btn btn-ghost px-3 py-1.5 text-[11.5px]">
              Save an account first
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-4">
          <AgentConfig
            game={game}
            settings={settings}
            onChange={updateSettings}
            apiKey={apiKey}
            onKeyChange={updateKey}
          />

          <section className="panel p-4">
            <p className="label">Context</p>
            {status === "ready" && profile ? (
              <>
                <p className="mt-2 text-[12.5px] text-white/90">
                  {profile.player.nickname} · {GAMES[game].short} · UID {profile.player.uid}
                </p>
                <p className="mt-1 text-[10.5px] text-faint">
                  {profile.characters.length} {game === "zzz" ? "agents" : "characters"} on the
                  showcase
                  {drafts.length ? ` · ${drafts.length} saved manual build${drafts.length === 1 ? "" : "s"}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.characters.map((character) => (
                    <span
                      key={character.id}
                      className="rounded-sm border border-white/[0.07] bg-black/40 px-1.5 py-0.5 text-[10px] text-white/65"
                    >
                      {character.name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="btn btn-ghost mt-3 w-full px-3 py-1.5 text-[11px]"
                >
                  Refresh showcase
                </button>
              </>
            ) : status === "loading" ? (
              <p className="mt-2 text-[11.5px] text-faint">Loading your showcase…</p>
            ) : status === "error" ? (
              <>
                <p className="mt-2 text-[11.5px] text-[#ffb3a3]">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="btn btn-ghost mt-2 px-3 py-1.5 text-[11px]"
                >
                  Try again
                </button>
              </>
            ) : (
              <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                {hydrated && !gameAccounts.length
                  ? "Save a UID on the home page and it shows up here."
                  : "Pick an account to load its showcase."}
              </p>
            )}
          </section>
        </div>

        <AgentChat
          key={chatKey}
          messages={messages}
          roster={roster}
          busy={busy}
          disabled={!toolContext}
          disabledReason={status === "loading" ? "Loading your showcase…" : "Pick an account to start."}
          initialText={initialText}
          onSend={send}
          onStop={() => controllerRef.current?.abort()}
          onClear={() => setMessages([])}
        />
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-faint">
        The agent only sees what this browser can see: your public showcase and any manual builds
        saved here. Replies come from the model you configured — check its work before you rebuild
        anything.
      </p>
    </div>
  );
}
