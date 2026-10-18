"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  MIN_PLAYERS,
  ROUND_OPTIONS,
  dealPrompts,
  fuseMs,
  loadSettings,
  ranked,
  saveSettings,
  type Settings,
} from "@/lib/hot-potato";
import { POTATO_PACKS } from "@/lib/hot-potato-prompts";
import { randomInt, type Player } from "@/lib/players";
import { boom, tick, unlockSound } from "@/lib/sound";
import type { Word } from "@/lib/words";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HomeLink,
  NumberChoice,
  PlayersSection,
  QuitBar,
  startLabel,
  usePlayers,
  useWakeLock,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "ready" }
  | { name: "fuse"; startedAt: number; endsAt: number }
  | { name: "boom" }
  | { name: "caught"; playerId: string | null }
  | { name: "final" };

export default function HotPotatoGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [prompts, setPrompts] = useState<Word[]>([]);
  const [round, setRound] = useState(0);
  const [potatoes, setPotatoes] = useState<Record<string, number>>({});
  /** Who holds the phone first this round: a random player, then whoever got caught last. */
  const [starterId, setStarterId] = useState<string | null>(null);
  const recentPrompts = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    const next = dealPrompts(settings.categoryIds, settings.rounds, recentPrompts.current);
    recentPrompts.current = [...next.map((w) => w.text), ...recentPrompts.current].slice(0, 40);
    setPrompts(next);
    setRound(0);
    setPotatoes(Object.fromEntries(players.map((p) => [p.id, 0])));
    setStarterId(players[randomInt(players.length)].id);
    setPhase({ name: "ready" });
  }

  function quit() {
    if (confirm("Stop this game and go back to setup?")) setPhase({ name: "setup" });
  }

  if (phase.name === "setup" || !prompts.length) {
    return (
      <Shell>
        <Setup
          players={players}
          onPlayersChange={setPlayers}
          settings={settings}
          onChange={setSettings}
          onStart={startGame}
        />
      </Shell>
    );
  }

  const prompt = prompts[round];
  const isLast = round >= prompts.length - 1;
  const starter = players.find((p) => p.id === starterId) ?? players[0];

  function caught(playerId: string | null) {
    if (playerId) {
      setPotatoes({ ...potatoes, [playerId]: (potatoes[playerId] ?? 0) + 1 });
      setStarterId(playerId);
    }
    setPhase({ name: "caught", playerId });
  }

  function next() {
    if (isLast) {
      setPhase({ name: "final" });
      return;
    }
    setRound(round + 1);
    setPhase({ name: "ready" });
  }

  return (
    <Shell dark={phase.name === "boom"}>
      {phase.name !== "final" && <QuitBar onQuit={quit} dark={phase.name === "boom"} />}

      {phase.name === "ready" && (
        <ReadyScreen
          caption={`Round ${round + 1} of ${prompts.length}`}
          prompt={prompt}
          starter={starter}
          onStart={() => {
            unlockSound();
            const now = Date.now();
            setPhase({ name: "fuse", startedAt: now, endsAt: now + fuseMs() });
          }}
        />
      )}

      {phase.name === "fuse" && (
        <FuseScreen
          prompt={prompt}
          startedAt={phase.startedAt}
          endsAt={phase.endsAt}
          onBoom={() => {
            boom();
            setPhase({ name: "boom" });
          }}
        />
      )}

      {phase.name === "boom" && <BoomScreen players={players} onPick={caught} />}

      {phase.name === "caught" && (
        <CaughtScreen
          player={players.find((p) => p.id === phase.playerId) ?? null}
          players={players}
          potatoes={potatoes}
          nextLabel={isLast ? "See who's coolest 🏆" : "Next round ➜"}
          onNext={next}
        />
      )}

      {phase.name === "final" && (
        <FinalScreen
          players={players}
          potatoes={potatoes}
          onPlayAgain={startGame}
          onSetup={() => setPhase({ name: "setup" })}
        />
      )}
    </Shell>
  );
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={dark ? "bg-ink" : ""}>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">{children}</main>
    </div>
  );
}

/* ---------- Setup ---------- */

function Setup({
  players,
  onPlayersChange,
  settings,
  onChange,
  onStart,
}: {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
}) {
  function update(patch: Partial<Settings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HomeLink />
      <header className="text-center">
        <div className="text-6xl" aria-hidden>
          🥔
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Hot Potato</h1>
        <p className="mt-1 text-lg text-ink/60">Say an answer, pass the phone. Don&apos;t be holding it when it goes BOOM!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        title="Topics"
        categories={POTATO_PACKS}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <NumberChoice
        title="How many rounds?"
        options={ROUND_OPTIONS}
        value={settings.rounds}
        onChange={(rounds) => update({ rounds })}
      />

      <div className="mt-auto pt-2">
        <BigButton onClick={onStart} disabled={players.length < MIN_PLAYERS}>
          {startLabel(players.length, MIN_PLAYERS)}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- Show the topic ---------- */

function PromptCard({ prompt }: { prompt: Word }) {
  return (
    <div key={prompt.text} className="animate-pop flex w-full flex-col items-center gap-3 rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-2xl font-semibold text-ink/60">Name…</p>
      {prompt.emoji && (
        <span className="text-8xl" aria-hidden>
          {prompt.emoji}
        </span>
      )}
      <p className="text-4xl font-bold leading-tight text-ink">{prompt.text}</p>
    </div>
  );
}

function ReadyScreen({
  caption,
  prompt,
  starter,
  onStart,
}: {
  caption: string;
  prompt: Word;
  starter: Player;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <PromptCard prompt={prompt} />
      <div className="flex items-center gap-3">
        <Avatar player={starter} size="sm" />
        <p className="text-2xl font-bold text-ink">{starter.name} holds it first</p>
      </div>
      <div className="w-full rounded-3xl bg-white p-5 text-left text-lg text-ink shadow-sm">
        <ol className="flex flex-col gap-1.5">
          <li>🗣️ Say one answer out loud</li>
          <li>👉 Then pass the phone to the next person</li>
          <li>🚫 No repeats, no passing without an answer!</li>
          <li>💥 Holding it when it pops? You get a 🥔</li>
        </ol>
      </div>
      <div className="mt-auto w-full">
        <BigButton onClick={onStart}>Light the fuse 🔥</BigButton>
      </div>
    </div>
  );
}

/* ---------- Tick, tick, tick… ---------- */

function FuseScreen({
  prompt,
  startedAt,
  endsAt,
  onBoom,
}: {
  prompt: Word;
  startedAt: number;
  endsAt: number;
  onBoom: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const explode = useEffectEvent(onBoom);
  useWakeLock();

  // Ticks get faster as the fuse burns down, but the screen never shows how long is left.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    function step() {
      const now = Date.now();
      if (now >= endsAt) {
        explode();
        return;
      }
      tick();
      setBeat((b) => b + 1);
      const burnt = (now - startedAt) / (endsAt - startedAt);
      id = setTimeout(step, Math.max(110, 700 - burnt * 600));
    }
    step();
    return () => clearTimeout(id);
  }, [startedAt, endsAt]);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <PromptCard prompt={prompt} />
      <span
        className="text-[10rem] leading-none transition-transform duration-100"
        style={{ transform: `rotate(${beat % 2 ? 12 : -12}deg) scale(${beat % 2 ? 1.08 : 1})` }}
        aria-hidden
      >
        🥔
      </span>
      <p className="text-3xl font-bold text-coral">Say it &amp; pass it!</p>
    </div>
  );
}

/* ---------- BOOM ---------- */

function BoomScreen({ players, onPick }: { players: Player[]; onPick: (playerId: string | null) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center text-white">
      <span className="animate-pop text-[8rem] leading-none" aria-hidden>
        💥
      </span>
      <p className="text-5xl font-bold">BOOM!</p>
      <p className="text-2xl font-semibold text-white/70">Who was holding it?</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex flex-col items-center gap-2 rounded-3xl bg-white/10 p-4 active:scale-95"
          >
            <Avatar player={p} />
            <span className="w-full truncate text-xl font-bold">{p.name}</span>
          </button>
        ))}
      </div>
      <button onClick={() => onPick(null)} className="mt-auto py-2 text-lg font-semibold text-white/50">
        Not sure – skip ⏭
      </button>
    </div>
  );
}

/* ---------- Who got the potato ---------- */

function Scoreboard({
  players,
  potatoes,
  highlight,
}: {
  players: Player[];
  potatoes: Record<string, number>;
  highlight?: string;
}) {
  return (
    <ol className="flex w-full flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm">
      {ranked(potatoes, players).map(({ player, score }) => (
        <li key={player.id} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
          <Avatar player={player} size="sm" />
          <span className="flex-1 truncate text-left text-xl font-semibold text-ink">{player.name}</span>
          {highlight === player.id && <span className="text-lg font-bold text-coral">+1</span>}
          <span className="text-right text-2xl tracking-tighter" aria-label={`${score} potatoes`}>
            {score ? "🥔".repeat(Math.min(score, 5)) + (score > 5 ? `×${score}` : "") : "–"}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CaughtScreen({
  player,
  players,
  potatoes,
  nextLabel,
  onNext,
}: {
  player: Player | null;
  players: Player[];
  potatoes: Record<string, number>;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {player ? (
        <>
          <div className="animate-pop pt-2">
            <Avatar player={player} size="xl" />
          </div>
          <p className="text-4xl font-bold text-coral">{player.name} got the potato! 🥔</p>
        </>
      ) : (
        <p className="pt-6 text-3xl font-bold text-ink">Nobody gets a potato this time 🙃</p>
      )}
      <Scoreboard players={players} potatoes={potatoes} highlight={player?.id} />
      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}

/* ---------- Final ---------- */

function FinalScreen({
  players,
  potatoes,
  onPlayAgain,
  onSetup,
}: {
  players: Player[];
  potatoes: Record<string, number>;
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  const rows = ranked(potatoes, players);
  const fewest = rows[0]?.score ?? 0;
  const winners = rows.filter((r) => r.score === fewest).map((r) => r.player);
  const everyone = winners.length === players.length;

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {everyone ? (
        <p className="pt-4 text-3xl font-bold text-ink">It&apos;s a tie – everyone&apos;s cool! 😎</p>
      ) : (
        <>
          <p className="pt-4 text-3xl font-bold text-ink">🥒 Cool as a cucumber</p>
          <div className="flex flex-wrap justify-center gap-6">
            {winners.map((p) => (
              <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
                <Avatar player={p} size={winners.length > 2 ? "md" : "xl"} />
                <span className="text-4xl font-bold text-teal">{p.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xl font-semibold text-ink/60">
            {fewest ? `Only ${fewest} potato${fewest === 1 ? "" : "es"}!` : "Never got caught!"}
          </p>
        </>
      )}

      <Scoreboard players={players} potatoes={potatoes} />

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or topics
        </BigButton>
      </div>
    </div>
  );
}
