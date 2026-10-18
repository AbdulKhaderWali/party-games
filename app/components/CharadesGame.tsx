"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  MAX_ROUNDS,
  MIN_PLAYERS,
  TIMER_OPTIONS,
  award,
  dealWord,
  loadSettings,
  newMatch,
  nextTurn,
  saveSettings,
  type Deal,
  type Match,
  type Settings,
} from "@/lib/charades";
import { CHARADES_CATEGORIES } from "@/lib/charades-words";
import type { Player } from "@/lib/players";
import { tick, timeUpBuzz, unlockSound } from "@/lib/sound";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HoldCard,
  HomeLink,
  PassScreen,
  PlayersSection,
  QuitBar,
  Stepper,
  startLabel,
  usePlayers,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "pass" }
  | { name: "card" }
  | { name: "acting"; endsAt: number }
  | { name: "whoGuessed"; endsAt: number }
  | { name: "turnEnd"; guesserId: string | null }
  | { name: "final" };

export default function CharadesGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [match, setMatch] = useState<Match | null>(null);
  const recentWords = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function remember(deal: Deal) {
    recentWords.current = [deal.word.text, ...recentWords.current].slice(0, 40);
  }

  function startGame() {
    const next = newMatch(players, settings, recentWords.current);
    remember(next.deal);
    setMatch(next);
    setPhase({ name: "pass" });
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
  const actor = byId.get(match.order[match.turn % n])!;
  const isLastTurn = match.turn === totalTurns - 1;

  function newWord() {
    if (!match) return;
    const deal = dealWord(settings.categoryIds, [...match.used, ...recentWords.current]);
    remember(deal);
    setMatch({ ...match, deal, used: [...match.used, deal.word.text] });
  }

  function pickGuesser(guesserId: string) {
    setMatch(award(match!, actor.id, guesserId));
    setPhase({ name: "turnEnd", guesserId });
  }

  function next() {
    if (isLastTurn) {
      setPhase({ name: "final" });
      return;
    }
    const upcoming = nextTurn(match!, settings, recentWords.current);
    remember(upcoming.deal);
    setMatch(upcoming);
    setPhase({ name: "pass" });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "pass" && (
        <PassScreen
          player={actor}
          caption={`Round ${Math.floor(match.turn / n) + 1} of ${settings.rounds} · Turn ${(match.turn % n) + 1} of ${n}`}
          onReady={() => setPhase({ name: "card" })}
        />
      )}

      {phase.name === "card" && (
        <CardScreen
          key={match.deal.word.text}
          actor={actor}
          deal={match.deal}
          seconds={settings.seconds}
          onNewWord={newWord}
          onStart={() => {
            unlockSound();
            setPhase({ name: "acting", endsAt: Date.now() + settings.seconds * 1000 });
          }}
        />
      )}

      {phase.name === "acting" && (
        <ActingScreen
          actor={actor}
          deal={match.deal}
          endsAt={phase.endsAt}
          seconds={settings.seconds}
          onGuessed={() => setPhase({ name: "whoGuessed", endsAt: phase.endsAt })}
          onTimeUp={() => {
            timeUpBuzz();
            setPhase({ name: "turnEnd", guesserId: null });
          }}
        />
      )}

      {phase.name === "whoGuessed" && (
        <WhoGuessedScreen
          guessers={match.order.filter((id) => id !== actor.id).map((id) => byId.get(id)!)}
          onPick={pickGuesser}
          onBack={() => setPhase({ name: "acting", endsAt: phase.endsAt })}
        />
      )}

      {phase.name === "turnEnd" && (
        <TurnEndScreen
          actor={actor}
          guesser={phase.guesserId ? byId.get(phase.guesserId)! : null}
          deal={match.deal}
          match={match}
          byId={byId}
          nextLabel={isLastTurn ? "See the winner 🏆" : `Next: ${byId.get(match.order[(match.turn + 1) % n])!.name} acts ➜`}
          onNext={next}
        />
      )}

      {phase.name === "final" && (
        <FinalScreen
          match={match}
          byId={byId}
          onPlayAgain={startGame}
          onSetup={() => setPhase({ name: "setup" })}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">{children}</main>;
}

function categoryOf(deal: Deal) {
  return CHARADES_CATEGORIES.find((c) => c.id === deal.categoryId)!;
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
          🎭
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Charades</h1>
        <p className="mt-1 text-lg text-ink/60">Act it out. No talking!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        categories={CHARADES_CATEGORIES}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">Time to act</h2>
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
          <p className="text-sm text-ink/50">Everyone acts once a round</p>
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

/* ---------- Actor sees the word ---------- */

function CardScreen({
  actor,
  deal,
  seconds,
  onNewWord,
  onStart,
}: {
  actor: Player;
  deal: Deal;
  seconds: number;
  onNewWord: () => void;
  onStart: () => void;
}) {
  const [seen, setSeen] = useState(false);
  const category = categoryOf(deal);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3">
        <Avatar player={actor} size="sm" />
        <p className="text-2xl font-bold text-ink">{actor.name}&apos;s word</p>
      </div>

      <HoldCard
        onSeen={() => setSeen(true)}
        backClassName="bg-white text-ink"
        back={
          <>
            <span className="text-lg font-semibold text-ink/50">Act this out!</span>
            {deal.word.emoji && (
              <span className="text-9xl" aria-hidden>
                {deal.word.emoji}
              </span>
            )}
            <span className="text-5xl font-bold leading-tight">{deal.word.text}</span>
            <span className="text-lg text-ink/50">
              {category.emoji} {category.name}
            </span>
          </>
        }
      />

      <div className="mt-auto flex w-full flex-col gap-3">
        {seen ? (
          <>
            <BigButton onClick={onStart}>Start acting ⏱ {seconds}s</BigButton>
            <button onClick={onNewWord} className="py-2 text-lg font-semibold text-ink/50">
              Don&apos;t know it? Get another word 🔄
            </button>
          </>
        ) : (
          <p className="py-5 text-xl text-ink/50">Hold the card, then let go to hide it.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Acting with the countdown ---------- */

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let done = false;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        if (done) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      done = true;
      void lock?.release();
    };
  }, []);
}

function ActingScreen({
  actor,
  deal,
  endsAt,
  seconds,
  onGuessed,
  onTimeUp,
}: {
  actor: Player;
  deal: Deal;
  endsAt: number;
  seconds: number;
  onGuessed: () => void;
  onTimeUp: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const timeUp = useEffectEvent(onTimeUp);
  useWakeLock();

  useEffect(() => {
    let lastTick = Infinity;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const left = Math.ceil((endsAt - t) / 1000);
      if (left <= 0) {
        clearInterval(id);
        timeUp();
      } else if (left <= 5 && left < lastTick) {
        lastTick = left;
        tick();
      }
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const progress = Math.min(1, Math.max(0, (endsAt - now) / (seconds * 1000)));
  const hurry = left <= 10;
  const category = categoryOf(deal);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3">
        <Avatar player={actor} size="sm" />
        <p className="text-2xl font-bold text-ink">{actor.name} is acting</p>
      </div>
      <p className="rounded-full bg-white px-4 py-2 text-xl font-semibold text-ink shadow-sm">
        {category.emoji} {category.name}
      </p>

      <div
        className={`relative grid size-64 place-items-center rounded-full ${hurry ? "animate-pulse" : ""}`}
        style={{
          background: `conic-gradient(${hurry ? "#ff6b4a" : "#19b3a5"} ${progress * 360}deg, #ffffff 0deg)`,
        }}
        role="timer"
        aria-label={`${left} seconds left`}
      >
        <div className="grid size-52 place-items-center rounded-full bg-cream">
          <span className={`text-8xl font-bold tabular-nums ${hurry ? "text-coral" : "text-ink"}`}>{left}</span>
        </div>
      </div>

      <p className="text-2xl font-bold text-ink/70">No talking! 🤐</p>

      <div className="mt-auto w-full">
        <BigButton onClick={onGuessed}>Someone guessed it! 🎉</BigButton>
      </div>
    </div>
  );
}

/* ---------- Pick who guessed ---------- */

function WhoGuessedScreen({
  guessers,
  onPick,
  onBack,
}: {
  guessers: Player[];
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <p className="pt-4 text-3xl font-bold text-ink">Who guessed it?</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {guessers.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 shadow-sm active:scale-95"
          >
            <Avatar player={p} />
            <span className="w-full truncate text-xl font-bold text-ink">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto w-full">
        <BigButton variant="secondary" onClick={onBack}>
          ← Oops, keep acting
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- Reveal the word ---------- */

function TurnEndScreen({
  actor,
  guesser,
  deal,
  match,
  byId,
  nextLabel,
  onNext,
}: {
  actor: Player;
  guesser: Player | null;
  deal: Deal;
  match: Match;
  byId: Map<string, Player>;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {guesser ? (
        <>
          <p className="pt-2 text-3xl font-bold text-teal">🎉 {guesser.name} got it!</p>
          <p className="text-lg font-semibold text-ink/60">
            +1 for {guesser.name} · +1 for {actor.name}
          </p>
        </>
      ) : (
        <>
          <p className="pt-2 text-3xl font-bold text-coral">⏰ Time&apos;s up!</p>
          <p className="text-lg font-semibold text-ink/60">No points this time</p>
        </>
      )}

      <div className="animate-pop w-full rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-lg font-semibold text-ink/50">The word was</p>
        {deal.word.emoji && (
          <p className="text-8xl" aria-hidden>
            {deal.word.emoji}
          </p>
        )}
        <p className="mt-1 text-4xl font-bold text-ink">{deal.word.text}</p>
      </div>

      <Scoreboard
        match={match}
        byId={byId}
        highlight={guesser ? [guesser.id, actor.id] : []}
      />

      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}

function ranked(match: Match, byId: Map<string, Player>) {
  return match.order
    .map((id) => ({ player: byId.get(id)!, score: match.scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

function Scoreboard({
  match,
  byId,
  highlight = [],
}: {
  match: Match;
  byId: Map<string, Player>;
  highlight?: string[];
}) {
  return (
    <ol className="flex w-full flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm">
      {ranked(match, byId).map(({ player, score }) => (
        <li key={player.id} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
          <Avatar player={player} size="sm" />
          <span className="flex-1 truncate text-left text-xl font-semibold text-ink">{player.name}</span>
          {highlight.includes(player.id) && <span className="text-lg font-bold text-teal">+1</span>}
          <span className="w-10 text-right text-2xl font-bold tabular-nums text-ink">{score}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Final ---------- */

function FinalScreen({
  match,
  byId,
  onPlayAgain,
  onSetup,
}: {
  match: Match;
  byId: Map<string, Player>;
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  const rows = ranked(match, byId);
  const top = rows[0]?.score ?? 0;
  const winners = top > 0 ? rows.filter((r) => r.score === top).map((r) => r.player) : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {winners.length ? (
        <>
          <p className="pt-4 text-3xl font-bold text-ink">🏆 {winners.length > 1 ? "It's a tie!" : "The winner is…"}</p>
          <div className="flex flex-wrap justify-center gap-6">
            {winners.map((p) => (
              <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
                <Avatar player={p} size="xl" />
                <span className="text-4xl font-bold text-coral">{p.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xl font-semibold text-ink/60">
            {top} point{top === 1 ? "" : "s"}
          </p>
        </>
      ) : (
        <p className="pt-4 text-3xl font-bold text-ink">Nobody scored this time! 🙃</p>
      )}

      <Scoreboard match={match} byId={byId} />

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or words
        </BigButton>
      </div>
    </div>
  );
}
