import Link from "next/link";
import { UidForm } from "@/components/UidForm";
import { GAMES } from "@/lib/site";
import zzzJson from "@/lib/data/zzz.json";
import hsrJson from "@/lib/data/hsr.json";

const zzzAgents = zzzJson.agents as Record<string, { name: string; icon: string | null }>;
const hsrChars = hsrJson.characters as Record<string, { name: string; portrait: string | null }>;

function findZzz(name: string) {
  const entry = Object.entries(zzzAgents).find(([, value]) => value.name === name);
  return entry?.[1] ?? null;
}

function findHsr(name: string) {
  const entry = Object.entries(hsrChars).find(([, value]) => value.name === name);
  return entry?.[1] ?? null;
}

const heroZzz = findZzz("Miyabi") ?? findZzz("Ellen") ?? Object.values(zzzAgents)[0] ?? null;
const heroHsr = findHsr("Firefly") ?? findHsr("Acheron") ?? Object.values(hsrChars)[0] ?? null;

const features = [
  {
    title: "Full agent sheets",
    body: "Level, rarity, element, core skill, W-Engine and every drive disc with its main stat, sub stats and roll count.",
  },
  {
    title: "Team build cards",
    body: "Assemble a lineup from your showcase and export a clean card with each member's key stats — ready for Discord.",
  },
  {
    title: "Share or download",
    body: "Every card has a permanent link and a PNG export. Drop it in a clan chat or a build review thread.",
  },
];

const steps = [
  {
    title: "Open your showcase",
    body: "In game: menu → profile → showcase. Pin the agents or characters you want on your cards and make sure the profile is public.",
  },
  {
    title: "Paste your UID",
    body: "Pick the game, drop in your UID. We read the public showcase — no password, no login, no cookies.",
  },
  {
    title: "Share the card",
    body: "Copy the link or export a PNG. Team cards and single character cards both come out ready to post.",
  },
];

const faqs = [
  {
    q: "Is this safe? Do I need to log in?",
    a: "No login. The showcase is public data that the game already exposes, and we only ever read your UID against Enka.Network's public API. Your UID alone can't be used to access your account.",
  },
  {
    q: "Why are only a few characters showing?",
    a: "The showcase only returns the characters pinned to your in-game profile (up to 12 in Star Rail, 3 agents in ZZZ). Astra can't see characters you haven't pinned.",
  },
  {
    q: "How accurate are the stats?",
    a: "Star Rail panels are computed from base stats, light cone, traces, relics and set bonuses. ZZZ sheets combine agent level, promotion, core skill and drive discs — W-Engine stat values aren't published by the API, so they're left out of the total.",
  },
  {
    q: "Where does the data come from?",
    a: "Live showcase data comes from Enka.Network. Names, icons and game tables come from the Enka API docs repository and Mar-7th/StarRailRes. Astra is a fan project, not affiliated with HoYoverse.",
  },
];

export default function HomePage() {
  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#7cf5d0]/[0.07] blur-[120px]" />
        <div className="absolute right-[10%] top-[80px] h-[320px] w-[320px] rounded-full bg-[#a98bff]/[0.09] blur-[100px]" />
      </div>

      <header className="relative">
        <div className="shell flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2.6l2.5 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6 6.5 19.7l1.4-6.3L3.1 9.1l6.4-.6z"
                  fill="#7cf5d0"
                />
              </svg>
            </span>
            <span className="font-display text-[17px] font-semibold tracking-[0.1em]">ASTRA</span>
          </div>
          <nav className="flex items-center gap-1 text-[12px] text-muted sm:gap-4">
            <a href="#how" className="hidden px-2 py-1 transition-colors hover:text-white sm:block">
              How it works
            </a>
            <a href="#faq" className="hidden px-2 py-1 transition-colors hover:text-white sm:block">
              FAQ
            </a>
            <a href="#lookup" className="btn btn-ghost px-3 py-1.5 text-[12px]">
              Open showcase
            </a>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="shell grid items-center gap-12 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-16">
          <div id="lookup" className="animate-fade-up scroll-mt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.16em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7cf5d0]" />
              Zenless Zone Zero · Honkai: Star Rail
            </p>
            <h1 className="font-display text-[42px] font-bold leading-[0.95] tracking-tight sm:text-[62px]">
              Your account,
              <br />
              <span className="bg-gradient-to-r from-[#7cf5d0] via-[#b8f3ff] to-[#a98bff] bg-clip-text text-transparent">
                carded.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted">
              Paste your UID and Astra turns your public showcase into detailed, shareable cards —
              full stat sheets, gear breakdowns and team build cards. No login, no install.
            </p>

            <div className="mt-7 max-w-lg">
              <UidForm />
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
              Nothing pinned to your showcase? You can{" "}
              <Link
                href="/zzz/manual"
                className="text-[#7cf5d0] underline decoration-dotted underline-offset-2 hover:text-white"
              >
                build a ZZZ card by hand
              </Link>{" "}
              or{" "}
              <Link
                href="/hsr/manual"
                className="text-[#8ec5ff] underline decoration-dotted underline-offset-2 hover:text-white"
              >
                an HSR card by hand
              </Link>
              .
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-faint">
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7cf5d0" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Read-only public data
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7cf5d0" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PNG export
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7cf5d0" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                No account needed
              </span>
            </div>
          </div>

          <div className="relative hidden h-[420px] lg:block">
            <div className="absolute left-6 top-4 w-[300px] rotate-[-6deg]">
              <div className="animate-float rounded-2xl border border-white/[0.08] bg-[#0a0a12] p-3 opacity-80">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                    {heroHsr?.portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroHsr.portrait} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-display text-[13px] text-white/90">{heroHsr?.name ?? "Character"}</p>
                    <p className="num text-[10px] text-faint">HSR · Lv.80</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {["3,842 HP", "164 SPD", "72.4% CRIT", "148.6% CD"].map((stat) => (
                    <div
                      key={stat}
                      className="num rounded border border-white/[0.05] bg-white/[0.03] px-1.5 py-1 text-[10px] text-white/70"
                    >
                      {stat}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-14 w-[320px] rotate-[4deg]">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#08080f] p-3 shadow-[0_40px_100px_-40px_rgba(124,245,208,0.35)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(247,216,74,0.18),transparent_60%)]" />
                <div className="relative flex items-center gap-2.5">
                  <div className="h-11 w-11 overflow-hidden rounded-xl border border-white/15 bg-black/50">
                    {heroZzz?.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroZzz.icon} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-semibold text-white">
                      {heroZzz?.name ?? "Agent"}
                    </p>
                    <p className="num text-[10px] text-faint">ZZZ · Lv.60 · Core F</p>
                  </div>
                  <span className="ml-auto text-[9px] tracking-[0.2em] text-[#ffd977]">★★★★★</span>
                </div>
                <div className="relative mt-3 grid grid-cols-2 gap-1.5">
                  {[
                    ["ATK", "2,317"],
                    ["CRIT Rate", "63.8%"],
                    ["CRIT DMG", "142.4%"],
                    ["Impact", "126"],
                    ["Anomaly Prof.", "147"],
                    ["PEN Ratio", "24.0%"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between rounded-md border border-white/[0.05] bg-white/[0.028] px-2 py-1"
                    >
                      <span className="text-[9px] uppercase tracking-wide text-faint">{label}</span>
                      <span className="num text-[11px] text-white/85">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="relative mt-2.5 flex gap-1.5">
                  {["4pc Branch & Blade", "Lv.60 W-Engine"].map((chip) => (
                    <span
                      key={chip}
                      className="truncate rounded-sm border border-white/[0.07] bg-black/40 px-2 py-1 text-[9.5px] text-white/65"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 w-[240px] -translate-x-1/2 rotate-[2deg]">
              <div className="rounded-xl border border-white/[0.08] bg-[#0b0b14]/90 p-2.5 backdrop-blur">
                <p className="label">Team build</p>
                <div className="mt-1.5 flex gap-1.5">
                  {[0, 1, 2].map((slot) => (
                    <div
                      key={slot}
                      className="h-11 flex-1 rounded-md border border-white/[0.06] bg-gradient-to-b from-white/[0.06] to-transparent"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[0.06] bg-white/[0.012]">
        <div className="shell grid gap-6 py-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title}>
              <h3 className="font-display text-[15px] font-semibold text-white">{feature.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="relative scroll-mt-20">
        <div className="shell py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label">How it works</p>
              <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                Three steps, one UID
              </h2>
            </div>
            <p className="hidden max-w-xs text-[12px] leading-relaxed text-faint sm:block">
              Works with the public character showcase, the same data the in-game profile shows to
              visitors.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="panel relative overflow-hidden p-5">
                <span className="num absolute right-3 top-2 text-[42px] font-bold leading-none text-white/[0.05]">
                  0{index + 1}
                </span>
                <h3 className="relative font-display text-[15px] font-semibold text-white">{step.title}</h3>
                <p className="relative mt-2 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative scroll-mt-20 border-t border-white/[0.06]">
        <div className="shell grid gap-8 py-14 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div>
            <p className="label">FAQ</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Good questions</h2>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-faint">
              Astra only ever reads your public showcase. Nothing is stored except a short-lived cache
              so we don&apos;t hammer the API.
            </p>
          </div>
          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-medium text-white/90">
                  {faq.q}
                  <span className="text-white/30 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06]">
        <div className="shell flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-[13px] tracking-[0.1em] text-white/80">ASTRA</p>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-faint">
              Fan-made showcase cards. Not affiliated with HoYoverse. Showcase data via Enka.Network;
              game tables via the Enka API docs and StarRailRes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Link href="/zzz/1300000579" className="btn btn-ghost px-3 py-1.5 text-[11px]">
              {GAMES.zzz.short} example
            </Link>
            <Link href="/hsr/801010942" className="btn btn-ghost px-3 py-1.5 text-[11px]">
              {GAMES.hsr.short} example
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
