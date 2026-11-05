import type { Metadata } from "next";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { SiteNav } from "@/components/SiteNav";
import { isGame } from "@/lib/site";

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
    <main className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute left-1/2 top-[-220px] h-[400px] w-[760px] -translate-x-1/2 rounded-full bg-[#a98bff]/[0.08] blur-[120px]" />
      </div>

      <div className="relative shrink-0">
        <SiteNav />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <AgentWorkspace
          initialGame={isGame(game) ? game : "zzz"}
          initialUid={uid}
          initialFocus={first(query.focus)}
        />
      </div>
    </main>
  );
}
