"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  busy,
  disabled,
  disabledReason,
  initialText,
  onSend,
  onStop,
  onClear,
}: {
  messages: ChatItem[];
  roster: { id: string; name: string }[];
  busy: boolean;
  disabled: boolean;
  disabledReason?: string;
  initialText?: string;
  onSend: (input: { text: string; mentions: string[] }) => void;
  onStop: () => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialText && !draft) setDraft(initialText);
    // Only seed once; the user's own edits win after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const needle = mentionQuery.toLowerCase();
    return roster
      .filter((entry) => entry.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [mentionQuery, roster]);

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

  return (
    <section className="panel flex min-h-[560px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
        <div>
          <p className="label">Build chat</p>
          <p className="mt-1 text-[10.5px] text-faint">
            @ an agent to focus the question, for example “how is @Jane built?”
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={busy || !messages.length}
          className="btn btn-ghost px-2.5 py-1 text-[10.5px] disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!messages.length ? (
          <div className="grid h-full place-items-center px-4 text-center">
            <div>
              <p className="font-display text-[15px] text-white/85">Ask about a build.</p>
              <p className="mx-auto mt-2 max-w-sm text-[11.5px] leading-relaxed text-faint">
                “What should I fix on @Jane?” · “Is my @Nicole doing enough anomaly?” · “Who should I
                run with @Jane?”
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm border border-[#7cf5d0]/20 bg-[#7cf5d0]/10 px-3 py-2 text-[12.5px] leading-relaxed text-white/90">
                {message.content}
              </div>
            </div>
          ) : (
            <div key={message.id} className="space-y-1.5">
              {message.tools?.length ? (
                <div className="space-y-0.5">
                  {message.tools.map((tool, index) => (
                    <p key={`${tool}-${index}`} className="text-[10px] text-faint">
                      <span className="mr-1 text-[#7cf5d0]">✓</span>
                      {tool}
                    </p>
                  ))}
                </div>
              ) : null}

              {message.content ? (
                <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                  <Markdown text={message.content} />
                </div>
              ) : null}

              {message.pending ? (
                <p className="flex items-center gap-1.5 text-[10.5px] text-faint">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[#7cf5d0]" />
                  Thinking…
                </p>
              ) : null}

              {message.error ? (
                <div className="max-w-[92%] rounded-xl border border-[#ff8f7a]/30 bg-[#ff8f7a]/10 px-3 py-2">
                  <p className="text-[11.5px] text-[#ffb3a3]">{message.error}</p>
                  {message.hint ? (
                    <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">{message.hint}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ),
        )}
      </div>

      <div className="relative border-t border-white/[0.07] px-3 py-3">
        {suggestions.length ? (
          <div className="absolute bottom-full left-3 mb-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#0b0b13] shadow-xl">
            {suggestions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(entry.name);
                }}
                className="block w-full px-2.5 py-1.5 text-left text-[12px] text-white/80 hover:bg-white/[0.06] hover:text-white"
              >
                {entry.name}
              </button>
            ))}
          </div>
        ) : null}

        <textarea
          ref={textarea}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            detectMention(event.target.value, event.target.selectionStart ?? 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") setMentionQuery(null);
          }}
          rows={3}
          disabled={disabled}
          placeholder={
            disabled ? (disabledReason ?? "Load a showcase to start chatting.") : "Ask about a build…"
          }
          className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12.5px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25 disabled:opacity-50"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-faint">
            Enter sends · Shift+Enter adds a line · your key never leaves this browser
          </p>
          <div className="flex gap-1.5">
            {busy ? (
              <button type="button" onClick={onStop} className="btn btn-ghost px-3 py-1.5 text-[11.5px]">
                Stop
              </button>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={disabled || busy || !draft.trim()}
              className="btn btn-primary px-3.5 py-1.5 text-[11.5px] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
