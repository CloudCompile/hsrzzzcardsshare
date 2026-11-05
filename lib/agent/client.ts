"use client";

import { chatEndpoint, type AgentSettings } from "./settings";

export interface WireToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type WireMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

export interface ParsedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type AgentErrorCode = "config" | "auth" | "cors" | "http" | "aborted";

export class AgentError extends Error {
  code: AgentErrorCode;
  hint: string;

  constructor(code: AgentErrorCode, message: string, hint = "") {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.hint = hint;
  }
}

interface ChatReply {
  content: string;
  toolCalls: ParsedToolCall[];
}

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function httpError(response: Response): Promise<AgentError> {
  const text = await response.text().catch(() => "");
  let detail = text;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") detail = parsed.error;
    else if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    // Keep the raw body; providers often answer with plain text.
  }
  const snippet = detail.slice(0, 300).replace(/\s+/g, " ").trim();

  if (response.status === 401 || response.status === 403) {
    return new AgentError(
      "auth",
      "The provider rejected that API key.",
      snippet || "Check the key, and that it can use the model you picked.",
    );
  }
  if (response.status === 404) {
    return new AgentError(
      "http",
      "Endpoint or model not found.",
      snippet || "Base URLs usually end in /v1. Double-check the model id too.",
    );
  }
  if (response.status === 429) {
    return new AgentError(
      "http",
      "The provider is rate limiting or out of quota.",
      snippet || "Wait a moment, or check the plan behind this key.",
    );
  }
  return new AgentError(
    "http",
    `The provider returned ${response.status}.`,
    snippet || "Try again, or switch models.",
  );
}

function mergeToolCall(
  calls: Map<number, { id: string; name: string; args: string }>,
  chunk: { index?: number; id?: string; function?: { name?: string; arguments?: string } },
) {
  const index = typeof chunk.index === "number" ? chunk.index : 0;
  const current = calls.get(index) ?? { id: "", name: "", args: "" };
  if (chunk.id) current.id = chunk.id;
  if (chunk.function?.name) current.name += chunk.function.name;
  if (chunk.function?.arguments) current.args += chunk.function.arguments;
  calls.set(index, current);
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onDelta?: (text: string) => void,
): Promise<ChatReply> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const calls = new Map<number, { id: string; name: string; args: string }>();
  let buffer = "";
  let content = "";
  let finished = false;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      for (const line of chunk.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") {
          finished = true;
          continue;
        }

        let event: {
          choices?: {
            delta?: {
              content?: string;
              tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
            };
          }[];
          error?: { message?: string };
        };
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }

        if (event.error?.message) throw new AgentError("http", event.error.message);
        const delta = event.choices?.[0]?.delta;
        if (typeof delta?.content === "string" && delta.content) {
          content += delta.content;
          onDelta?.(delta.content);
        }
        if (Array.isArray(delta?.tool_calls)) {
          for (const call of delta.tool_calls) mergeToolCall(calls, call);
        }
      }
    }
  }

  return {
    content,
    toolCalls: [...calls.entries()].map(([index, call]) => ({
      id: call.id || `call_${index}`,
      name: call.name,
      args: parseArgs(call.args),
    })),
  };
}

export async function chatCompletion({
  settings,
  apiKey,
  messages,
  tools,
  signal,
  onDelta,
}: {
  settings: AgentSettings;
  apiKey: string;
  messages: WireMessage[];
  tools: unknown[];
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
}): Promise<ChatReply> {
  const endpoint = chatEndpoint(settings.baseUrl);
  if (!endpoint) {
    throw new AgentError("config", "Add a base URL for your provider.", "For example https://api.openai.com/v1");
  }
  if (!settings.model.trim()) {
    throw new AgentError("config", "Pick a model id.", "For example gpt-4o-mini or anthropic/claude-3.5-sonnet");
  }
  if (!apiKey.trim()) {
    throw new AgentError("config", "Add an API key.", "The key is sent straight from this browser to your provider.");
  }

  const body: Record<string, unknown> = {
    model: settings.model.trim(),
    messages,
    temperature: 0.3,
    stream: settings.stream,
  };
  if (tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  let response: Response;
  try {
    response = settings.viaRelay
      ? await fetch("/api/agent/relay", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-astra-target": endpoint,
            "x-astra-key": apiKey,
          },
          body: JSON.stringify(body),
          signal,
        })
      : await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal,
        });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new AgentError("aborted", "Stopped.");
    }
    throw new AgentError(
      "cors",
      "The browser couldn't reach the provider.",
      settings.viaRelay
        ? "The relay request failed too — check the base URL."
        : "This is usually CORS. Turn on “Relay through Astra” in settings and try again.",
    );
  }

  if (!response.ok) throw await httpError(response);

  const contentType = response.headers.get("content-type") ?? "";
  if (settings.stream && contentType.includes("text/event-stream") && response.body) {
    return readStream(response.body, onDelta);
  }

  const data = (await response.json().catch(() => ({}))) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
      };
    }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new AgentError("http", data.error.message);

  const message = data.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content : "";
  // A provider that ignored `stream` still lands here; surface the text in one go.
  if (content) onDelta?.(content);

  return {
    content,
    toolCalls: (message?.tool_calls ?? []).map((call, index) => ({
      id: call.id || `call_${index}`,
      name: call.function?.name ?? "",
      args: parseArgs(call.function?.arguments ?? ""),
    })),
  };
}

export interface TurnResult {
  /** Wire messages produced this turn, in order, so the caller can keep the thread. */
  messages: WireMessage[];
  text: string;
  stopped: boolean;
}

export async function agentTurn({
  settings,
  apiKey,
  system,
  history,
  tools,
  execute,
  signal,
  onDelta,
  onTool,
  maxRounds = 6,
}: {
  settings: AgentSettings;
  apiKey: string;
  system: string;
  history: WireMessage[];
  tools: unknown[];
  execute: (name: string, args: Record<string, unknown>) => Promise<string>;
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
  onTool?: (name: string, args: Record<string, unknown>, output: string) => void;
  maxRounds?: number;
}): Promise<TurnResult> {
  const conversation: WireMessage[] = [{ role: "system", content: system }, ...history];
  const produced: WireMessage[] = [];
  let text = "";
  let stopped = false;

  for (let round = 0; round < maxRounds; round += 1) {
    let reply: ChatReply;
    try {
      reply = await chatCompletion({
        settings,
        apiKey,
        messages: conversation,
        tools,
        signal,
        onDelta,
      });
    } catch (error) {
      if (error instanceof AgentError && error.code === "aborted") {
        stopped = true;
        break;
      }
      throw error;
    }

    text = reply.content || text;

    const assistant: WireMessage = {
      role: "assistant",
      content: reply.content || null,
      ...(reply.toolCalls.length
        ? {
            tool_calls: reply.toolCalls.map((call) => ({
              id: call.id,
              type: "function" as const,
              function: { name: call.name, arguments: JSON.stringify(call.args) },
            })),
          }
        : {}),
    };
    conversation.push(assistant);
    produced.push(assistant);

    if (!reply.toolCalls.length) return { messages: produced, text, stopped };

    for (const call of reply.toolCalls) {
      let output: string;
      try {
        output = await execute(call.name, call.args);
      } catch (error) {
        output = JSON.stringify({ error: error instanceof Error ? error.message : "Tool failed." });
      }
      onTool?.(call.name, call.args, output);
      const toolMessage: WireMessage = {
        role: "tool",
        content: output,
        tool_call_id: call.id,
      };
      conversation.push(toolMessage);
      produced.push(toolMessage);
    }
  }

  return { messages: produced, text, stopped };
}
