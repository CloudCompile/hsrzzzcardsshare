"use client";

import { useState } from "react";
import { AgentError, chatCompletion } from "@/lib/agent/client";
import { modelsEndpoint, type AgentSettings } from "@/lib/agent/settings";
import { GAMES } from "@/lib/site";
import type { Game } from "@/lib/types";

const FIELD =
  "w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25";

type Status = { kind: "idle" | "busy" | "ok" | "error"; message: string; hint?: string };

export function AgentConfig({
  game,
  settings,
  onChange,
  apiKey,
  onKeyChange,
}: {
  game: Game;
  settings: AgentSettings;
  onChange: (patch: Partial<AgentSettings>) => void;
  apiKey: string;
  onKeyChange: (value: string) => void;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [showKey, setShowKey] = useState(false);

  async function loadModels() {
    if (!settings.baseUrl.trim()) {
      setStatus({ kind: "error", message: "Add a base URL first." });
      return;
    }
    setStatus({ kind: "busy", message: "Loading models…" });
    try {
      const response = await fetch(modelsEndpoint(settings.baseUrl), {
        headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
      const data = (await response.json()) as { data?: { id?: string }[] };
      const ids = (Array.isArray(data?.data) ? data.data : [])
        .map((entry) => String(entry?.id ?? ""))
        .filter(Boolean);
      setModels(ids.slice(0, 300));
      setStatus({
        kind: ids.length ? "ok" : "error",
        message: ids.length ? `${ids.length} models available.` : "No models returned.",
        hint: ids.length ? undefined : "Type the model id by hand instead.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't load the model list.",
        hint: "Some providers don't expose it, or block browser calls. Type the model id instead.",
      });
    }
  }

  async function test() {
    setStatus({ kind: "busy", message: "Testing…" });
    try {
      const reply = await chatCompletion({
        settings: { ...settings, stream: false },
        apiKey,
        messages: [{ role: "user", content: "Reply with the single word: ready" }],
        tools: [],
      });
      setStatus({
        kind: "ok",
        message: `Connected. Model said: ${(reply.content || "(empty)").slice(0, 60)}`,
      });
    } catch (error) {
      const agentError = error instanceof AgentError ? error : null;
      setStatus({
        kind: "error",
        message: agentError?.message ?? "Connection failed.",
        hint: agentError?.hint,
      });
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="label">Provider · {GAMES[game].short} agent</p>
        <span className="text-[10px] text-faint">saved in this browser</span>
      </div>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-faint">
            Base URL
          </span>
          <input
            value={settings.baseUrl}
            onChange={(event) => onChange({ baseUrl: event.target.value })}
            placeholder="https://api.openai.com/v1"
            spellCheck={false}
            className={`${FIELD} num`}
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-faint">
            <span>Model</span>
            <button
              type="button"
              onClick={loadModels}
              className="normal-case tracking-normal text-[10px] text-[#7cf5d0] hover:text-white"
            >
              Load models
            </button>
          </span>
          <input
            value={settings.model}
            onChange={(event) => onChange({ model: event.target.value })}
            placeholder="gpt-4o-mini"
            spellCheck={false}
            list="astra-agent-models"
            className={`${FIELD} num`}
          />
          <datalist id="astra-agent-models">
            {models.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-faint">
            <span>API key</span>
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="normal-case tracking-normal text-[10px] text-muted hover:text-white"
            >
              {showKey ? "hide" : "show"}
            </button>
          </span>
          <input
            value={apiKey}
            onChange={(event) => onKeyChange(event.target.value)}
            type={showKey ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
            className={`${FIELD} num`}
          />
        </label>

        <div className="space-y-1.5 pt-1">
          <Toggle
            label="Stream replies"
            checked={settings.stream}
            onChange={(stream) => onChange({ stream })}
          />
          <Toggle
            label="Keep the key after closing the tab"
            checked={settings.rememberKey}
            onChange={(rememberKey) => onChange({ rememberKey })}
          />
          <Toggle
            label="Relay through Astra (use if the browser is blocked)"
            checked={settings.viaRelay}
            onChange={(viaRelay) => onChange({ viaRelay })}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={test} className="btn btn-primary px-3 py-1.5 text-[11.5px]">
            Test connection
          </button>
        </div>

        {status.kind !== "idle" ? (
          <div
            className={`rounded-md border px-2.5 py-2 text-[10.5px] leading-relaxed ${
              status.kind === "error"
                ? "border-[#ff8f7a]/30 bg-[#ff8f7a]/10 text-[#ffb3a3]"
                : status.kind === "ok"
                  ? "border-[#7cf5d0]/30 bg-[#7cf5d0]/10 text-[#9df6da]"
                  : "border-white/10 bg-white/[0.03] text-muted"
            }`}
          >
            <p>{status.message}</p>
            {status.hint ? <p className="mt-1 text-white/45">{status.hint}</p> : null}
          </div>
        ) : null}

        <p className="text-[10px] leading-relaxed text-faint">
          Requests go straight from this browser to your provider; Astra never sees your key. The
          relay is a pass-through you only need when a provider blocks browser calls.
        </p>
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[#7cf5d0]"
      />
      {label}
    </label>
  );
}
