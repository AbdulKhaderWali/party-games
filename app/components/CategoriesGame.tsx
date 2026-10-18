"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  MAX_ROUNDS,
  MIN_PLAYERS,
  TIMER_OPTIONS,
  dealTurn,
  loadSettings,
  lettersFor,
  saveSettings,
  type LetterSet,
  type Settings,
  type Turn,
} from "@/lib/categories-az";
import { randomInt, shuffle, type Player } from "@/lib/players";
import { ding, tick, timeUpBuzz, unlockSound } from "@/lib/sound";
import {
  Avatar,
  BigButton,
  HomeLink,
  PlayersSection,
  QuitBar,
  Scoreboard,
  Stepper,
  TimePill,
  Winners,
  rankByScore,
  startLabel,
  usePlayers,
  useTimeLeft,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "spin" }
  | { name: "spinning"; respun: boolean }
  | { name: "ready"; respun: boolean }
  | { name: "playing"; endsAt: number; count: number }
  | { name: "turnEnd"; count: number }
  | { name: "final" };

type Match = { order: string[]; turn: number; scores: Record<string, number> };

/** How many recent topics and letters to avoid repeating. */
const RECENT_TURNS = 6;

export default function CategoriesGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [match, setMatch] = useState<Match | null>(null);
  const [current, setCurrent] = useState<Turn | null>(null);
  const history = useRef<Turn[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    setMatch({
      order: shuffle(players.map((p) => p.id)),
      turn: 0,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    });
    setPhase({ name: "spin" });
  }

  function quit() {
    if (confirm("Stop this game and go back to setup?")) setPhase({ name: "setup" });
  }

  if (phase.name === "setup" || !match) {
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

  const byId = new Map(players.map((p) => [p.id, p]));
  const n = match.order.length;
  const totalTurns = n * settings.rounds;
  const player = byId.get(match.order[match.turn % n])!;
  const isLastTurn = match.turn === totalTurns - 1;
  const rows = rankByScore(
    players.filter((p) => match.order.includes(p.id)),
    match.scores,
  );

  function spin(respun = false) {
    unlockSound();
    const turn = dealTurn(settings.letters, history.current.slice(0, RECENT_TURNS));
    history.current = [turn, ...history.current].slice(0, 20);
    setCurrent(turn);
    setPhase({ name: "spinning", respun });
  }

  function finishTurn(count: number) {
    setMatch({ ...match!, scores: { ...match!.scores, [player.id]: (match!.scores[player.id] ?? 0) + count } });
    setPhase({ name: "turnEnd", count });
  }

  function next() {
    if (isLastTurn) {
      setPhase({ name: "final" });
      return;
    }
    setMatch({ ...match!, turn: match!.turn + 1 });
    setPhase({ name: "spin" });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "spin" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-lg font-semibold text-ink/50">
            Round {Math.floor(match.turn / n) + 1} of {settings.rounds} · Turn {(match.turn % n) + 1} of {n}
          </p>
          <p className="text-3xl font-bold text-ink">It&apos;s your turn</p>
          <div className="animate-pop">
            <Avatar player={player} size="xl" />
          </div>
          <p className="text-5xl font-bold text-ink">{player.name}</p>
          <p className="text-lg text-ink/60">Spin for a letter, then name as many things as you can!</p>
          <div className="mt-auto w-full">
            <BigButton onClick={() => spin()}>Spin! 🎰</BigButton>
          </div>
        </div>
      )}

      {phase.name === "spinning" && current && (
        <SpinningScreen
          letters={lettersFor(settings.letters)}
          turn={current}
          onDone={() => setPhase({ name: "ready", respun: phase.respun })}
        />
      )}

      {phase.name === "ready" && current && (
        <div className="flex flex-1 flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <Avatar player={player} size="sm" />
            <p className="text-2xl font-bold text-ink">{player.name}, name…</p>
          </div>
          <Challenge turn={current} />
          <p className="text-lg text-ink/60">Everyone else: tap +1 for every good answer!</p>
          <div className="mt-auto flex w-full flex-col gap-3">
            <BigButton onClick={() => setPhase({ name: "playing", endsAt: Date.now() + settings.seconds * 1000, count: 0 })}>
              Go! ⏱ {settings.seconds}s
            </BigButton>
            {!phase.respun && (
              <button onClick={() => spin(true)} className="py-2 text-lg font-semibold text-ink/50"
              >
                Too hard? Spin again (once) 🔄
              </button>
            )}
          </div>
        </div>
      )}

      {phase.name === "playing" && current && (
        <PlayingScreen
          player={player}
          turn={current}
          endsAt={phase.endsAt}
          count={phase.count}
          onCount={(count) => setPhase({ ...phase, count })}
          onDone={finishTurn}
          onTimeUp={(count) => {
            timeUpBuzz();
            finishTurn(count);
          }}
        />
      )}

      {phase.name === "turnEnd" && current && (
        <div className="flex flex-1 flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3 pt-2">
            <Avatar player={player} size="sm" />
            <p className="text-3xl font-bold text-ink">
              {phase.count ? `${player.name} got ${phase.count}! 🎉` : `Phew, that was tricky! 😅`}
            </p>
          </div>
          <p className="text-lg font-semibold text-ink/60">
            {current.topic.emoji} {current.topic.text} starting with {current.letter}
          </p>
          <Scoreboard rows={rows} gains={phase.count ? { [player.id]: `+${phase.count}` } : {}} />
          <div className="mt-auto w-full">
            <BigButton onClick={next}>
              {isLastTurn ? "See the winner 🏆" : `Next: ${byId.get(match.order[(match.turn + 1) % n])!.name} ➜`}
            </BigButton>
          </div>
        </div>
      )}

      {phase.name === "final" && (
        <div className="flex flex-1 flex-col items-center gap-5 text-center">
          <Winners rows={rows} />
          <Scoreboard rows={rows} />
          <div className="mt-auto flex w-full flex-col gap-3">
            <BigButton onClick={startGame}>Play again 🔄</BigButton>
            <BigButton variant="secondary" onClick={() => setPhase({ name: "setup" })}>
              Change players or settings
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

/* ---------- Setup ---------- */

const LETTER_SETS: { id: LetterSet; name: string; hint: string }[] = [
  { id: "easy", name: "Easy letters", hint: "A, B, C, S, T…" },
  { id: "all", name: "All letters", hint: "Even J, U and V!" },
];

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
          🔤
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Categories A–Z</h1>
        <p className="mt-1 text-lg text-ink/60">An animal starting with B? Go go go!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">Letters</h2>
        <div className="grid grid-cols-2 gap-2">
          {LETTER_SETS.map((s) => {
            const on = settings.letters === s.id;
            return (
              <button
                key={s.id}
                onClick={() => update({ letters: s.id })}
                aria-pressed={on}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition-colors ${
                  on ? "border-sun bg-sun/25 text-ink" : "border-ink/10 bg-cream text-ink/50"
                }`}
              >
                <span className="block text-lg font-semibold">{s.name}</span>
                <span className="block text-sm">{s.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">Time per turn</h2>
        <div className="grid grid-cols-4 gap-2">
          {TIMER_OPTIONS.map((s) => {
            const on = settings.seconds === s;
            return (
              <button
                key={s}
                onClick={() => update({ seconds: s })}
                aria-pressed={on}
                className={`rounded-2xl border-2 py-3 text-xl font-bold transition-colors ${
                  on ? "border-sun bg-sun/25 text-ink" : "border-ink/10 bg-cream text-ink/50"
                }`}
              >
                {s}s
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-ink">Rounds</h2>
          <p className="text-sm text-ink/50">Everyone plays once a round</p>
        </div>
        <div className="flex items-center gap-3">
          <Stepper label="Fewer rounds" disabled={settings.rounds <= 1} onClick={() => update({ rounds: settings.rounds - 1 })}>
            −
          </Stepper>
          <span className="w-8 text-center text-3xl font-bold text-ink">{settings.rounds}</span>
          <Stepper
            label="More rounds"
            disabled={settings.rounds >= MAX_ROUNDS}
            onClick={() => update({ rounds: settings.rounds + 1 })}
          >
            +
          </Stepper>
        </div>
      </section>

      <div className="mt-auto pt-2">
        <BigButton onClick={onStart} disabled={players.length < MIN_PLAYERS}>
          {startLabel(players.length, MIN_PLAYERS)}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- The challenge card ---------- */

function Challenge({ turn }: { turn: Turn }) {
  return (
    <div className="animate-pop flex w-full flex-col items-center gap-2 rounded-3xl bg-white p-5 shadow-sm">
      <span className="text-6xl" aria-hidden>
        {turn.topic.emoji}
      </span>
      <span className="text-3xl font-bold leading-tight text-ink">{turn.topic.text}</span>
      <span className="text-xl font-semibold text-ink/50">starting with</span>
      <span className="grid size-28 place-items-center rounded-3xl bg-coral text-8xl font-bold text-white">
        {turn.letter}
      </span>
    </div>
  );
}

/** Flicks through letters like a slot machine, then lands on the turn's letter. */
function SpinningScreen({ letters, turn, onDone }: { letters: string[]; turn: Turn; onDone: () => void }) {
  const [shown, setShown] = useState(letters[0]);
  const [landed, setLanded] = useState(false);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    const flick = setInterval(() => {
      setShown(letters[randomInt(letters.length)]);
      tick();
    }, 90);
    const land = setTimeout(() => {
      clearInterval(flick);
      setShown(turn.letter);
      setLanded(true);
      ding();
    }, 1500);
    const finish = setTimeout(() => done(), 2300);
    return () => {
      clearInterval(flick);
      clearTimeout(land);
      clearTimeout(finish);
    };
  }, [letters, turn]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center" aria-live="polite">
      <p className="text-3xl font-bold text-ink">
        {turn.topic.emoji} {turn.topic.text}
      </p>
      <span
        key={landed ? "landed" : "spinning"}
        className={`grid size-48 place-items-center rounded-[2.5rem] text-[8rem] font-bold text-white ${
          landed ? "animate-pop bg-coral" : "bg-ink/80"
        }`}
      >
        {shown}
      </span>
    </div>
  );
}

/* ---------- Name them fast ---------- */

function PlayingScreen({
  player,
  turn,
  endsAt,
  count,
  onCount,
  onDone,
  onTimeUp,
}: {
  player: Player;
  turn: Turn;
  endsAt: number;
  count: number;
  onCount: (count: number) => void;
  onDone: (count: number) => void;
  onTimeUp: (count: number) => void;
}) {
  const { left } = useTimeLeft(endsAt, () => onTimeUp(count));

  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <div className="flex w-full items-center gap-2">
        <Avatar player={player} size="sm" />
        <p className="flex-1 truncate text-left text-xl font-bold text-ink">{player.name}</p>
        <TimePill left={left} />
      </div>

      <div className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
        <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-coral text-6xl font-bold text-white">
          {turn.letter}
        </span>
        <span className="text-left text-2xl font-bold leading-tight text-ink">
          {turn.topic.emoji} {turn.topic.text}
        </span>
      </div>

      <p key={count} className="animate-pop text-[7rem] font-bold leading-none tabular-nums text-teal" aria-live="polite">
        {count}
      </p>

      <div className="mt-auto flex w-full flex-col gap-3">
        <button
          onClick={() => {
            ding();
            onCount(count + 1);
          }}
          className="w-full rounded-3xl bg-teal px-6 py-10 text-4xl font-bold text-white shadow-[0_6px_0_#11857a] transition-transform active:translate-y-1.5 active:shadow-none"
        >
          +1 Good one! ✅
        </button>
        <div className="grid grid-cols-2 gap-3">
          <BigButton variant="secondary" onClick={() => onCount(Math.max(0, count - 1))}>
            −1 Oops
          </BigButton>
          <BigButton variant="secondary" onClick={() => onDone(count)}>
            Done ✋
          </BigButton>
        </div>
      </div>
    </div>
  );
}
