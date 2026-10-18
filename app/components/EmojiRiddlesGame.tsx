"use client";

import { useEffect, useRef, useState } from "react";
import {
  MIN_PLAYERS,
  POINTS,
  QUESTION_OPTIONS,
  dealRiddles,
  hintFor,
  loadSettings,
  saveSettings,
  type Riddle,
  type Settings,
} from "@/lib/emoji-riddles";
import { RIDDLE_PACKS } from "@/lib/emoji-riddles-prompts";
import type { Player } from "@/lib/players";
import { ding, unlockSound } from "@/lib/sound";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HomeLink,
  NumberChoice,
  PlayersSection,
  QuitBar,
  Scoreboard,
  Winners,
  WhoGuessedScreen,
  rankByScore,
  startLabel,
  usePlayers,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "ask"; hints: number }
  | { name: "whoGuessed"; hints: number }
  | { name: "reveal"; guesserId: string | null; points: number }
  | { name: "final" };

export default function EmojiRiddlesGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const recent = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    const next = dealRiddles(settings.categoryIds, settings.questions, recent.current);
    recent.current = [...next.map((r) => r.text), ...recent.current].slice(0, 40);
    setRiddles(next);
    setIndex(0);
    setScores(Object.fromEntries(players.map((p) => [p.id, 0])));
    setPhase({ name: "ask", hints: 0 });
  }

  function quit() {
    if (confirm("Stop this game and go back to setup?")) setPhase({ name: "setup" });
  }

  if (phase.name === "setup" || !riddles.length) {
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

  const riddle = riddles[index];
  const isLast = index >= riddles.length - 1;
  const rows = rankByScore(players, scores);

  function reveal(guesserId: string | null, hints: number) {
    const points = guesserId ? POINTS[Math.min(hints, POINTS.length - 1)] : 0;
    if (guesserId) {
      ding();
      setScores({ ...scores, [guesserId]: (scores[guesserId] ?? 0) + points });
    }
    setPhase({ name: "reveal", guesserId, points });
  }

  function next() {
    if (isLast) {
      setPhase({ name: "final" });
      return;
    }
    setIndex(index + 1);
    setPhase({ name: "ask", hints: 0 });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "ask" && (
        <AskScreen
          caption={`Riddle ${index + 1} of ${riddles.length}`}
          riddle={riddle}
          hints={phase.hints}
          onHint={() => setPhase({ name: "ask", hints: phase.hints + 1 })}
          onGotIt={() => {
            unlockSound();
            setPhase({ name: "whoGuessed", hints: phase.hints });
          }}
          onGiveUp={() => reveal(null, phase.hints)}
        />
      )}

      {phase.name === "whoGuessed" && (
        <WhoGuessedScreen
          title="Who got it first?"
          guessers={players}
          backLabel="← Oops, keep guessing"
          onPick={(id) => reveal(id, phase.hints)}
          onBack={() => setPhase({ name: "ask", hints: phase.hints })}
        />
      )}

      {phase.name === "reveal" && (
        <RevealScreen
          riddle={riddle}
          guesser={players.find((p) => p.id === phase.guesserId) ?? null}
          points={phase.points}
          rows={rows}
          nextLabel={isLast ? "See the winner 🏆" : "Next riddle ➜"}
          onNext={next}
        />
      )}

      {phase.name === "final" && (
        <div className="flex flex-1 flex-col items-center gap-5 text-center">
          <Winners rows={rows} />
          <Scoreboard rows={rows} />
          <div className="mt-auto flex w-full flex-col gap-3">
            <BigButton onClick={startGame}>Play again 🔄</BigButton>
            <BigButton variant="secondary" onClick={() => setPhase({ name: "setup" })}>
              Change players or riddles
            </BigButton>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">{children}</main>;
}

function packOf(riddle: Riddle) {
  return RIDDLE_PACKS.find((c) => c.id === riddle.categoryId)!;
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
          🧩
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Emoji Riddles</h1>
        <p className="mt-1 text-lg text-ink/60">Crack the emoji code. Shout it out first!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        title="Riddles"
        categories={RIDDLE_PACKS}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <NumberChoice
        title="How many riddles?"
        options={QUESTION_OPTIONS}
        value={settings.questions}
        onChange={(questions) => update({ questions })}
      />

      <div className="mt-auto pt-2">
        <BigButton onClick={onStart} disabled={players.length < MIN_PLAYERS}>
          {startLabel(players.length, MIN_PLAYERS)}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- The riddle ---------- */

function Blanks({ answer, hints }: { answer: string; hints: number }) {
  return (
    <p className="flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-2xl font-bold text-ink" aria-label="Hint">
      {hintFor(answer, hints).map((word, i) => (
        <span key={i} className="whitespace-pre">
          {word}
        </span>
      ))}
    </p>
  );
}

function AskScreen({
  caption,
  riddle,
  hints,
  onHint,
  onGotIt,
  onGiveUp,
}: {
  caption: string;
  riddle: Riddle;
  hints: number;
  onHint: () => void;
  onGotIt: () => void;
  onGiveUp: () => void;
}) {
  const pack = packOf(riddle);
  const worth = POINTS[Math.min(hints, POINTS.length - 1)];

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <p className="rounded-full bg-white px-4 py-2 text-xl font-semibold text-ink shadow-sm">
        {pack.emoji} {pack.name}
      </p>

      <div
        key={riddle.text}
        className="animate-pop flex min-h-48 w-full items-center justify-center rounded-3xl bg-white p-6 text-7xl leading-tight shadow-sm"
        aria-label={`Emoji riddle: ${riddle.emoji}`}
      >
        <span className="break-all">{riddle.emoji}</span>
      </div>

      {hints > 0 && <Blanks answer={riddle.text} hints={hints} />}

      <p className="text-xl font-bold text-ink/70">
        Worth {"⭐".repeat(worth)} {worth} point{worth === 1 ? "" : "s"}
      </p>

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onGotIt}>Someone got it! 🎉</BigButton>
        {hints < 2 && (
          <BigButton variant="secondary" onClick={onHint}>
            💡 {hints === 0 ? "Hint: how many letters?" : "Hint: first letters"}
          </BigButton>
        )}
        <button onClick={onGiveUp} className="py-2 text-lg font-semibold text-ink/50">
          Nobody knows? Show the answer 🙈
        </button>
      </div>
    </div>
  );
}

/* ---------- The answer ---------- */

function RevealScreen({
  riddle,
  guesser,
  points,
  rows,
  nextLabel,
  onNext,
}: {
  riddle: Riddle;
  guesser: Player | null;
  points: number;
  rows: ReturnType<typeof rankByScore>;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {guesser ? (
        <div className="flex items-center gap-3 pt-2">
          <Avatar player={guesser} size="sm" />
          <p className="text-3xl font-bold text-teal">{guesser.name} got it!</p>
        </div>
      ) : (
        <p className="pt-2 text-3xl font-bold text-coral">Tricky one! 🤯</p>
      )}

      <div className="animate-pop w-full rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-5xl" aria-hidden>
          {riddle.emoji}
        </p>
        <p className="mt-3 text-lg font-semibold text-ink/50">The answer is</p>
        <p className="text-4xl font-bold text-ink">{riddle.text}</p>
      </div>

      <Scoreboard rows={rows} gains={guesser ? { [guesser.id]: `+${points}` } : {}} />

      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}
