"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * Inline rich text for replies: a safe subset of HTML plus `**bold**`, `code`
 * and `*italic*`. Tags are parsed into React elements — never injected as HTML —
 * and only colour / font / motion classes are honoured, so a reply cannot run
 * script, load images or escape the chat's styling.
 */

const ALLOWED = new Set([
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "del",
  "mark",
  "small",
  "code",
  "br",
  "sup",
  "sub",
]);

const COLORS: Record<string, string> = {
  accent: "#7cf5d0",
  violet: "#c9b8ff",
  gold: "#f7d84a",
  danger: "#ff8f7f",
  sky: "#8ec5ff",
  dim: "rgba(255, 255, 255, 0.52)",
  white: "#ffffff",
};

const FONTS: Record<string, string> = {
  display: "var(--font-display)",
  mono: "var(--font-mono)",
  serif: "ui-serif, Georgia, serif",
  sans: "var(--font-sans)",
};

const MOTION: Record<string, string> = {
  shimmer: "rich-shimmer",
  glow: "rich-glow",
  pulse: "rich-pulse",
  flicker: "rich-flicker",
  rise: "rich-rise",
};

const TAG = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/;

const COLOR_VALUE =
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/a-z]+\)|currentColor|transparent|[a-z]{3,20})$/i;

type Attrs = { class?: string; style?: string };

type Node =
  | { kind: "text"; value: string }
  | { kind: "tag"; tag: string; attrs: Attrs; children: Node[] };

function parseAttrs(raw: string): Attrs {
  const attrs: Attrs = {};
  const pattern = /([a-zA-Z-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(raw))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    // Only these two are read; anything else (onerror, src, href…) is dropped.
    if (name === "class") attrs.class = value;
    if (name === "style") attrs.style = value;
  }
  return attrs;
}

/** Index just past the matching close tag, counting nested same-name tags. */
function findClose(source: string, from: number, tag: string): { start: number; end: number } | null {
  const open = new RegExp(`<${tag}(?=[\\s/>])`, "gi");
  const close = new RegExp(`</${tag}\\s*>`, "gi");
  open.lastIndex = from;
  close.lastIndex = from;
  let depth = 1;
  while (depth > 0) {
    const nextOpen = open.exec(source);
    const nextClose = close.exec(source);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      close.lastIndex = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return { start: nextClose.index, end: nextClose.index + nextClose[0].length };
    open.lastIndex = nextClose.index + nextClose[0].length;
  }
  return null;
}

function parseNodes(source: string): Node[] {
  const nodes: Node[] = [];
  let index = 0;

  while (index < source.length) {
    const lt = source.indexOf("<", index);
    if (lt === -1) {
      nodes.push({ kind: "text", value: source.slice(index) });
      break;
    }
    if (lt > index) nodes.push({ kind: "text", value: source.slice(index, lt) });

    const match = TAG.exec(source.slice(lt));
    if (!match) {
      nodes.push({ kind: "text", value: "<" });
      index = lt + 1;
      continue;
    }

    const [whole, closing, rawTag, rawAttrs, selfClose] = match;
    const tag = rawTag.toLowerCase();
    const after = lt + whole.length;

    if (closing || !ALLOWED.has(tag)) {
      // Unknown or stray-closing tags stay visible as text instead of vanishing.
      nodes.push({ kind: "text", value: whole });
      index = after;
      continue;
    }

    if (selfClose || tag === "br") {
      nodes.push({ kind: "tag", tag, attrs: parseAttrs(rawAttrs), children: [] });
      index = after;
      continue;
    }

    const close = findClose(source, after, tag);
    if (!close) {
      // Streamed mid-tag: show the opening tag as text until its close arrives.
      nodes.push({ kind: "text", value: whole });
      index = after;
      continue;
    }

    nodes.push({
      kind: "tag",
      tag,
      attrs: parseAttrs(rawAttrs),
      children: parseNodes(source.slice(after, close.start)),
    });
    index = close.end;
  }

  return nodes;
}

/** `**bold**`, `` `code` `` and `*italic*` inside a plain-text run. */
function markdownInline(value: string, prefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null = null;
  let index = 0;

  while ((match = pattern.exec(value))) {
    if (match.index > last) parts.push(value.slice(last, match.index));
    const token = match[0];
    const key = `${prefix}-md${index}`;
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key} className="num rounded bg-white/10 px-1 py-0.5 text-[11.5px] text-white/90">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={key} className="text-white/80">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
    index += 1;
  }

  if (last < value.length) parts.push(value.slice(last));
  return parts;
}

interface Decor {
  color?: string;
  font?: string;
  motion: string[];
  wave: boolean;
}

function decorate(attrs: Attrs): Decor {
  const motion: string[] = [];
  let color: string | undefined;
  let font: string | undefined;
  let wave = false;

  for (const token of (attrs.class ?? "").split(/\s+/).filter(Boolean)) {
    const name = token.toLowerCase();
    if (COLORS[name]) color = COLORS[name];
    else if (FONTS[name]) font = FONTS[name];
    else if (name === "wave") wave = true;
    else if (MOTION[name]) motion.push(MOTION[name]);
  }

  for (const declaration of (attrs.style ?? "").split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const prop = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (prop === "color" && COLOR_VALUE.test(value)) color = value;
    if (prop === "font-family") {
      const named = FONTS[value.toLowerCase().replace(/['"]/g, "")];
      if (named) font = named;
    }
  }

  return { color, font, motion, wave };
}

function waveChars(nodes: Node[], key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let index = 0;
  for (const node of nodes) {
    if (node.kind !== "text") {
      out.push(renderNode(node, `${key}-w${index}`));
      index += 1;
      continue;
    }
    for (const char of Array.from(node.value)) {
      if (char === " ") {
        out.push(" ");
      } else {
        out.push(
          <span
            key={`${key}-c${index}`}
            className="rich-wave-char"
            style={{ animationDelay: `${(index * 45) % 540}ms` }}
          >
            {char}
          </span>,
        );
      }
      index += 1;
    }
  }
  return out;
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.kind === "text") {
    return <Fragment key={key}>{markdownInline(node.value, key)}</Fragment>;
  }

  const { tag, attrs, children } = node;
  if (tag === "br") return <br key={key} />;

  const decor = decorate(attrs);
  const style: CSSProperties = {};
  if (decor.color) style.color = decor.color;
  if (decor.font) style.fontFamily = decor.font;

  const inner = decor.wave ? waveChars(children, key) : renderChildren(children, key);

  switch (tag) {
    case "b":
    case "strong":
      return (
        <strong key={key} className="font-semibold text-white" style={style}>
          {inner}
        </strong>
      );
    case "i":
    case "em":
      return (
        <em key={key} className="italic" style={style}>
          {inner}
        </em>
      );
    case "u":
      return (
        <u key={key} className="underline decoration-white/30 underline-offset-2" style={style}>
          {inner}
        </u>
      );
    case "s":
    case "del":
      return (
        <s key={key} className="text-white/45" style={style}>
          {inner}
        </s>
      );
    case "mark":
      return (
        <mark
          key={key}
          className="rounded bg-[#f7d84a]/18 px-1 py-px text-[#ffe9a3]"
          style={style}
        >
          {inner}
        </mark>
      );
    case "small":
      return (
        <span key={key} className="text-[10.5px] text-white/60" style={style}>
          {inner}
        </span>
      );
    case "code":
      return (
        <code key={key} className="num rounded bg-white/10 px-1 py-0.5 text-[11.5px] text-white/90" style={style}>
          {inner}
        </code>
      );
    case "sup":
      return (
        <sup key={key} style={style}>
          {inner}
        </sup>
      );
    case "sub":
      return (
        <sub key={key} style={style}>
          {inner}
        </sub>
      );
    default:
      return (
        <span
          key={key}
          className={decor.motion.length ? decor.motion.join(" ") : undefined}
          style={Object.keys(style).length ? style : undefined}
        >
          {inner}
        </span>
      );
  }
}

function renderChildren(nodes: Node[], key: string): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`));
}

/** Renders one inline run, including any safe HTML the model wrote. */
export function inline(value: string, prefix: string): ReactNode[] {
  // A half-streamed tag would otherwise flash as raw markup. Only strip what
  // looks like the opening of a tag, so "5 < 10" survives.
  const text = value.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^<>]*)?$/, "");
  if (!text.includes("<")) return markdownInline(text, prefix);
  return parseNodes(text).map((node, index) => renderNode(node, `${prefix}-${index}`));
}
