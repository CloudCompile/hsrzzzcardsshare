"use client";

import { useMemo } from "react";
import type { ShowcaseProfile } from "@/lib/types";
import { BuildArtifact, ChartArtifact, CodeBlock, parseChart } from "./Artifacts";

/**
 * Markdown subset for chat replies: headings, lists, tables, fenced code and
 * Astra's inline blocks (`astra-chart`, `astra-build`). No HTML, no dependencies.
 */
export function Markdown({ text, profile }: { text: string; profile?: ShowcaseProfile | null }) {
  const blocks = useMemo(() => parse(text, profile ?? null), [text, profile]);
  return <div className="space-y-2.5">{blocks}</div>;
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

function Fence({
  info,
  code,
  closed,
  profile,
}: {
  info: string;
  code: string;
  closed: boolean;
  profile: ShowcaseProfile | null;
}) {
  const kind = info.replace(/^language-/, "").toLowerCase();

  if (kind === "astra-chart" || kind === "chart") {
    const spec = closed ? parseChart(code) : null;
    if (spec) return <ChartArtifact spec={spec} />;
  }

  if (kind === "astra-build" || kind === "build") {
    if (closed) {
      let query = code.trim();
      try {
        const parsed = JSON.parse(code) as { agent?: unknown; name?: unknown };
        query = String(parsed.agent ?? parsed.name ?? "");
      } catch {
        // A bare name on its own line works too.
      }
      if (query) return <BuildArtifact query={query} profile={profile} />;
    }
  }

  return <CodeBlock code={code} language={kind} streaming={!closed} />;
}

function cells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function Table({ rows, header }: { rows: string[][]; header: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b0b13]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {header.map((cell, index) => (
              <th
                key={index}
                className="px-2.5 py-1.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-faint"
              >
                {inline(cell, `th${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-white/[0.04] last:border-0">
              {header.map((_, cellIndex) => (
                <td
                  key={cellIndex}
                  className="num px-2.5 py-1.5 text-[11px] text-white/80"
                >
                  {inline(row[cellIndex] ?? "", `td${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parse(text: string, profile: ShowcaseProfile | null): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];
  let index = 0;

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-1 text-[12.5px] text-white/80">
          {bullets.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item, `b${blocks.length}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
    if (ordered.length) {
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="ml-4 list-decimal space-y-1 text-[12.5px] text-white/80">
          {ordered.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item, `o${blocks.length}-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      ordered = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    const fence = /^```([A-Za-z][\w:-]*)?\s*(.*)$/.exec(line.trim());
    if (fence) {
      flush();
      const info = fence[1] ?? "";
      const body: string[] = fence[2] ? [fence[2]] : [];
      let closed = false;
      index += 1;
      while (index < lines.length) {
        if (/^```\s*$/.test(lines[index].trim())) {
          closed = true;
          index += 1;
          break;
        }
        body.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <Fence
          key={`fence-${blocks.length}`}
          info={info}
          code={body.join("\n").trimEnd()}
          closed={closed}
          profile={profile}
        />,
      );
      continue;
    }

    const next = lines[index + 1]?.trim() ?? "";
    if (line.trim().startsWith("|") && /^\|?[\s:|-]+\|?$/.test(next) && next.includes("-")) {
      flush();
      const header = cells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push(<Table key={`table-${blocks.length}`} header={header} rows={rows} />);
      continue;
    }

    index += 1;

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
          className="pt-1 font-display text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/70"
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
