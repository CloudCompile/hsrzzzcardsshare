"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseProfile } from "@/lib/types";
import { Markdown } from "./Markdown";

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  error?: string;
  hint?: string;
  pending?: boolean;
}

export function AgentChat({
  messages,
  roster,
  profile,
  busy,
  model,
  disabled,
  disabledReason,
  initialText,
  seed,
  onSeed,
  onSend,
  onStop,
  onClear,
  onOpenSettings,
}: {
  messages: ChatItem[];
  roster: { id: string; name: string }[];
  profile?: ShowcaseProfile | null;
  busy: boolean;
  model: string;
  disabled: boolean;
  disabledReason?: string;
  initialText?: string;
  seed?: { text: string; token: number };
  onSeed: (text: string) => void;
  onSend: (input: { text: string; mentions: string[] }) => void;
  onStop: () => void;
  onClear: () => void;
  onOpenSettings: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialText && !draft) setDraft(initialText);
    // Only seed once; the user's own edits win after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  useEffect(() => {
    if (!seed) return;
    setDraft(seed.text);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const element = textarea.current;
      element?.focus();
      element?.setSelectionRange(seed.text.length, seed.text.length);
    });
  }, [seed]);

  // Auto-grow up to six lines, like a real composer.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(176, element.scrollHeight)}px`;
  }, [draft]);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const needle = mentionQuery.toLowerCase();
    return roster.filter((entry) => entry.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [mentionQuery, roster]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  function detectMention(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = /(?:^|\s)@([\w' -]{0,24})$/.exec(before);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(name: string) {
    const element = textarea.current;
    const caret = element?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret).replace(/@[\w' -]*$/, `@${name} `);
    const after = draft.slice(caret);
    const next = `${before}${after}`;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(before.length, before.length);
    });
  }

  function submit() {
    const text = draft.trim();
    if (!text || busy || disabled) return;
    const mentions = roster
      .filter((entry) => new RegExp(`@${escape(entry.name)}\\b`, "i").test(text))
      .map((entry) => entry.id);
    onSend({ text, mentions });
    setDraft("");
    setMentionQuery(null);
  }

  const first = roster[0]?.name;
  const prompts = [
    {
      title: "Audit a build",
      body: first ? `Go through @${first}'s discs and tell me the weakest piece.` : "Go through my build and call out the weakest piece.",
    },
    { title: "Crit check", body: "Is my crit ratio good enough on my damage dealer?" },
    { title: "Team fit", body: "Who pairs best with the agents on my showcase?" },
    { title: "What to max next", body: "What should I level or max next, given what I already have?" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length ? (
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[860px] space-y-6 px-5 py-7">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-md border border-[#7cf5d0]/20 bg-[#7cf5d0]/[0.09] px-3.5 py-2 text-[13px] leading-relaxed text-white/90">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/12 bg-black/60">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2.6l2.5 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6 6.5 19.7l1.4-6.3L3.1 9.1l6.4-.6z"
                        fill="#7cf5d0"
                      />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-[10px] tracking-[0.14em] text-white/55">
                        AGENT
                      </span>
                      {message.tools?.length ? (
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-faint transition-colors hover:text-white/70">
                            <span className="text-[#7cf5d0]/80">✓</span>
                            {message.tools.length} lookup{message.tools.length === 1 ? "" : "s"}
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="transition-transform group-open:rotate-90"
                            >
                              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </summary>
                          <ul className="mt-1 space-y-0.5 pl-1">
                            {message.tools.map((tool, index) => (
                              <li key={`${tool}-${index}`} className="text-[10px] text-faint">
                                {tool}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {message.pending ? (
                        <span className="flex items-center gap-1" aria-label="Thinking">
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-1 w-1 animate-pulse rounded-full bg-[#7cf5d0]"
                              style={{ animationDelay: `${dot * 160}ms` }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>

                    {message.content ? (
                      <div className="border-l border-white/[0.09] pl-3">
                        <Markdown text={message.content} profile={profile} />
                      </div>
                    ) : null}

                    {message.error ? (
                      <div className="rounded-xl border border-[#ff8f7a]/25 bg-[#ff8f7a]/[0.07] px-3 py-2">
                        <p className="text-[11.5px] text-[#ffb3a3]">{message.error}</p>
                        {message.hint ? (
                          <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">
                            {message.hint}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="mt-2 text-[10.5px] text-[#7cf5d0] underline decoration-dotted underline-offset-2 hover:text-white"
                        >
                          Open settings
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col justify-center px-5 py-10">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-black/60">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2.6l2.5 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6 6.5 19.7l1.4-6.3L3.1 9.1l6.4-.6z"
                  fill="#7cf5d0"
                />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-[22px] font-semibold tracking-tight">
              What are we fixing today?
            </h2>
            <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
              {disabled
                ? (disabledReason ?? "Pick an account to start.")
                : "I can read every agent on your showcase, so ask about a specific build or a whole lineup."}
            </p>

            {roster.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {roster.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSeed(`Tell me about @${entry.name}`)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:border-white/25 hover:text-white"
                  >
                    @{entry.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt.title}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSeed(prompt.body)}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04] disabled:opacity-50"
                >
                  <p className="text-[11.5px] font-medium text-white/85">{prompt.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-faint group-hover:text-muted">
                    {prompt.body}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-white/[0.06] bg-[#05050a]/85 backdrop-blur">
        <div className="mx-auto w-full max-w-[860px] px-5 pb-4 pt-3">
          <div className="relative">
            {suggestions.length ? (
              <div className="absolute bottom-full left-2 mb-1.5 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b13] shadow-2xl">
                {suggestions.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(entry.name);
                    }}
                    onMouseEnter={() => setMentionIndex(index)}
                    className={`block w-full px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                      index === mentionIndex
                        ? "bg-white/[0.08] text-white"
                        : "text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-[#0b0b13] px-3 py-2 transition-colors focus-within:border-white/25">
              <textarea
                ref={textarea}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  detectMention(event.target.value, event.target.selectionStart ?? 0);
                }}
                onKeyDown={(event) => {
                  if (suggestions.length) {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setMentionIndex((index) => Math.min(index + 1, suggestions.length - 1));
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setMentionIndex((index) => Math.max(index - 1, 0));
                      return;
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      insertMention(suggestions[mentionIndex]?.name ?? suggestions[0].name);
                      return;
                    }
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                  if (event.key === "Escape") setMentionQuery(null);
                }}
                rows={1}
                disabled={disabled}
                placeholder={
                  disabled
                    ? (disabledReason ?? "Load a showcase to start chatting.")
                    : "Ask about a build…"
                }
                className="max-h-[176px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25 disabled:opacity-50"
              />

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Mention an agent"
                    onClick={() => {
                      setDraft((current) => (current.endsWith("@") ? current : `${current}@`));
                      textarea.current?.focus();
                      setMentionQuery("");
                    }}
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-[11px] text-muted transition-colors hover:border-white/25 hover:text-white"
                  >
                    @
                  </button>
                  <span className="max-w-[190px] truncate text-[10px] text-faint">
                    {model || "no model set"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {busy ? (
                    <button
                      type="button"
                      onClick={onStop}
                      className="btn btn-ghost px-2.5 py-1 text-[10.5px]"
                    >
                      Stop
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={disabled || busy || !draft.trim()}
                    aria-label="Send"
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#7cf5d0] text-black transition-opacity disabled:bg-white/10 disabled:text-white/30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M12 19V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-faint">
            Enter to send · Shift+Enter for a new line · replies come from your own model
          </p>
        </div>
      </div>
    </div>
  );
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
