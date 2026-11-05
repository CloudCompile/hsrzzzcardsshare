"use client";

import { useMemo } from "react";

/** Tiny markdown renderer: headings, bullets, bold and inline code. No tables, no HTML. */
export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parse(text), [text]);
  return <div className="space-y-2">{blocks}</div>;
}

function inline(value: string, prefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null = null;
  let index = 0;

  while ((match = pattern.exec(value))) {
    if (match.index > last) parts.push(value.slice(last, match.index));
    const token = match[0];
    const key = `${prefix}-${index}`;
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

function parse(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-1 text-[12.5px] text-white/80">
          {bullets.map((item, index) => (
            <li key={index}>{inline(item, `b${blocks.length}-${index}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
    if (ordered.length) {
      blocks.push(
        <ol
          key={`ol-${blocks.length}`}
          className="ml-4 list-decimal space-y-1 text-[12.5px] text-white/80"
        >
          {ordered.map((item, index) => (
            <li key={index}>{inline(item, `o${blocks.length}-${index}`)}</li>
          ))}
        </ol>,
      );
      ordered = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push(
        <p
          key={`h-${blocks.length}`}
          className="font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70"
        >
          {inline(heading[2], `h${blocks.length}`)}
        </p>,
      );
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      if (ordered.length) flush();
      bullets.push(bullet[1]);
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (bullets.length) flush();
      ordered.push(numbered[1]);
      continue;
    }
    flush();
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[12.5px] leading-relaxed text-white/80">
        {inline(line, `p${blocks.length}`)}
      </p>,
    );
  }

  flush();
  return blocks;
}
