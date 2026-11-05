import type { Metadata } from "next";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { SiteNav } from "@/components/SiteNav";
import { GAMES, isGame } from "@/lib/site";

export const metadata: Metadata = {
  title: "Build agent",
  description:
    "Point Astra's build agent at your own OpenAI-compatible model and ask it what to fix on your ZZZ or HSR showcase. Your key stays in your browser.",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function AgentPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const game = first(query.game);
  const uid = first(query.uid).replace(/[^\d]/g, "");

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute left-1/2 top-[-200px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#a98bff]/[0.09] blur-[120px]" />
      </div>

      <div className="relative">
        <SiteNav />
      </div>

      <div className="relative">
        <AgentWorkspace
          initialGame={isGame(game) ? game : "zzz"}
          initialUid={uid}
          initialFocus={first(query.focus)}
        />
      </div>

      <p className="shell pb-8 text-[10.5px] leading-relaxed text-faint">
        {GAMES.zzz.short} and {GAMES.hsr.short} are separate agents with their own model settings and
        chat history, stored locally.
      </p>
    </main>
  );
}
