"use client";

import { useEffect, useRef, useState } from "react";
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
} from "@/lib/draw-it";
import { DRAW_CATEGORIES } from "@/lib/draw-it-words";
import type { Player } from "@/lib/players";
import { timeUpBuzz, unlockSound } from "@/lib/sound";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HoldCard,
  HomeLink,
  PassScreen,
  PlayersSection,
  QuitBar,
  Scoreboard,
  Stepper,
  TimePill,
  Winners,
  WhoGuessedScreen,
  rankByScore,
  startLabel,
  usePlayers,
  useTimeLeft,
} from "./shared";

/** Points are in a 100×100 box so drawings scale to any screen. */
type Stroke = { color: string; width: number; points: [number, number][] };

/** One finished turn, kept for the gallery at the end. */
type Drawing = { word: Deal["word"]; artistId: string; strokes: Stroke[] };

type Phase =
  | { name: "setup" }
  | { name: "pass" }
  | { name: "card" }
  | { name: "drawing"; endsAt: number }
  | { name: "whoGuessed"; endsAt: number }
  | { name: "turnEnd"; guesserId: string | null }
  | { name: "final" };

const PAPER = "#ffffff";
const COLORS = ["#2b2140", "#ff6b4a", "#ffc83d", "#19b3a5", "#2f86d6", "#7b5cff", "#3fae49", "#8a5a3b"];
const PENS = [
  { width: 1.5, label: "Thin pen" },
  { width: 4, label: "Thick pen" },
];

export default function DrawItGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [match, setMatch] = useState<Match | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [gallery, setGallery] = useState<Drawing[]>([]);
  const recentWords = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function remember(deal: Deal) {
    recentWords.current = [deal.word.text, ...recentWords.current].slice(0, 40);
  }

  function startGame() {
    const next = newMatch(players, settings, recentWords.current);
    remember(next.deal);
    setMatch(next);
    setStrokes([]);
    setGallery([]);
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
  const artist = byId.get(match.order[match.turn % n])!;
  const isLastTurn = match.turn === totalTurns - 1;

  function newWord() {
    if (!match) return;
    const deal = dealWord(settings.categoryIds, [...match.used, ...recentWords.current]);
    remember(deal);
    setMatch({ ...match, deal, used: [...match.used, deal.word.text] });
  }

  function endTurn(guesserId: string | null) {
    if (guesserId) setMatch(award(match!, artist.id, guesserId));
    setGallery([...gallery, { word: match!.deal.word, artistId: artist.id, strokes }]);
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
    setStrokes([]);
    setPhase({ name: "pass" });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "pass" && (
        <PassScreen
          player={artist}
          caption={`Round ${Math.floor(match.turn / n) + 1} of ${settings.rounds} · Turn ${(match.turn % n) + 1} of ${n}`}
          onReady={() => setPhase({ name: "card" })}
        />
      )}

      {phase.name === "card" && (
        <CardScreen
          key={match.deal.word.text}
          artist={artist}
          deal={match.deal}
          seconds={settings.seconds}
          onNewWord={newWord}
          onStart={() => {
            unlockSound();
            setPhase({ name: "drawing", endsAt: Date.now() + settings.seconds * 1000 });
          }}
        />
      )}

      {phase.name === "drawing" && (
        <DrawingScreen
          artist={artist}
          deal={match.deal}
          endsAt={phase.endsAt}
          strokes={strokes}
          onStrokesChange={setStrokes}
          onGuessed={() => setPhase({ name: "whoGuessed", endsAt: phase.endsAt })}
          onTimeUp={() => {
            timeUpBuzz();
            endTurn(null);
          }}
        />
      )}

      {phase.name === "whoGuessed" && (
        <WhoGuessedScreen
          guessers={match.order.filter((id) => id !== artist.id).map((id) => byId.get(id)!)}
          backLabel="← Oops, keep drawing"
          onPick={endTurn}
          onBack={() => setPhase({ name: "drawing", endsAt: phase.endsAt })}
        />
      )}

      {phase.name === "turnEnd" && (
        <TurnEndScreen
          artist={artist}
          guesser={phase.guesserId ? byId.get(phase.guesserId)! : null}
          deal={match.deal}
          strokes={strokes}
          rows={rankByScore(players.filter((p) => match.order.includes(p.id)), match.scores)}
          nextLabel={isLastTurn ? "See the winner 🏆" : `Next: ${byId.get(match.order[(match.turn + 1) % n])!.name} draws ➜`}
          onNext={next}
        />
      )}

      {phase.name === "final" && (
        <FinalScreen
          rows={rankByScore(players.filter((p) => match.order.includes(p.id)), match.scores)}
          gallery={gallery}
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
  return DRAW_CATEGORIES.find((c) => c.id === deal.categoryId)!;
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
          🖍️
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Draw It!</h1>
        <p className="mt-1 text-lg text-ink/60">Draw the secret word. No letters or numbers!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        categories={DRAW_CATEGORIES}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">Time to draw</h2>
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
          <p className="text-sm text-ink/50">Everyone draws once a round</p>
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

/* ---------- Artist sees the word ---------- */

function CardScreen({
  artist,
  deal,
  seconds,
  onNewWord,
  onStart,
}: {
  artist: Player;
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
        <Avatar player={artist} size="sm" />
        <p className="text-2xl font-bold text-ink">{artist.name}&apos;s word</p>
      </div>

      <HoldCard
        onSeen={() => setSeen(true)}
        backClassName="bg-white text-ink"
        back={
          <>
            <span className="text-lg font-semibold text-ink/50">Draw this!</span>
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
            <BigButton onClick={onStart}>Start drawing ⏱ {seconds}s</BigButton>
            <button onClick={onNewWord} className="py-2 text-lg font-semibold text-ink/50">
              Too hard? Get another word 🔄
            </button>
          </>
        ) : (
          <p className="py-5 text-xl text-ink/50">Hold the card, then let go to hide it.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- The drawing pad ---------- */

function pathOf(stroke: Stroke) {
  const [first, ...rest] = stroke.points;
  // Repeat the first point so a single tap still draws a dot.
  return `M${first[0]} ${first[1]} ` + [first, ...rest].map(([x, y]) => `L${x} ${y}`).join(" ");
}

function Strokes({ strokes }: { strokes: Stroke[] }) {
  return strokes.map((s, i) => (
    <path
      key={i}
      d={pathOf(s)}
      fill="none"
      stroke={s.color}
      strokeWidth={s.width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

/** Shows a finished drawing. */
function Picture({ strokes, className = "" }: { strokes: Stroke[]; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`aspect-square rounded-2xl ${className}`} style={{ background: PAPER }} aria-hidden>
      <Strokes strokes={strokes} />
    </svg>
  );
}

function DrawingPad({ strokes, onChange }: { strokes: Stroke[]; onChange: (strokes: Stroke[]) => void }) {
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(PENS[0].width);
  const drawing = useRef(false);

  function pointOf(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <svg
        viewBox="0 0 100 100"
        className="aspect-square w-full touch-none rounded-3xl shadow-sm"
        style={{ background: PAPER }}
        role="img"
        aria-label="Drawing pad"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          onChange([...strokes, { color, width, points: [pointOf(e)] }]);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !strokes.length) return;
          const p = pointOf(e);
          const last = strokes[strokes.length - 1];
          const [lx, ly] = last.points[last.points.length - 1];
          if (Math.abs(p[0] - lx) + Math.abs(p[1] - ly) < 0.6) return;
          onChange([...strokes.slice(0, -1), { ...last, points: [...last.points, p] }]);
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      >
        <Strokes strokes={strokes} />
      </svg>

      <div className="flex justify-between gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label="Pen colour"
            aria-pressed={color === c}
            className={`size-9 rounded-full border-4 transition-transform ${color === c ? "scale-110 border-ink/40" : "border-white"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {PENS.map((pen) => (
          <button
            key={pen.width}
            onClick={() => setWidth(pen.width)}
            aria-label={pen.label}
            aria-pressed={width === pen.width && color !== PAPER}
            className={`grid place-items-center rounded-2xl border-2 py-2 ${
              width === pen.width && color !== PAPER ? "border-sun bg-sun/25" : "border-ink/10 bg-white"
            }`}
          >
            <span className="rounded-full bg-ink" style={{ width: pen.width * 5, height: pen.width * 5 }} />
          </button>
        ))}
        <ToolButton label="Rubber" on={color === PAPER} onClick={() => { setColor(PAPER); setWidth(PENS[1].width); }}>
          🧽
        </ToolButton>
        <ToolButton label="Undo" disabled={!strokes.length} onClick={() => onChange(strokes.slice(0, -1))}>
          ↩️
        </ToolButton>
        <ToolButton label="Clear" disabled={!strokes.length} onClick={() => onChange([])}>
          🗑️
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  on,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on}
      className={`rounded-2xl border-2 py-2 text-2xl disabled:opacity-30 ${on ? "border-sun bg-sun/25" : "border-ink/10 bg-white"}`}
    >
      {children}
    </button>
  );
}

function DrawingScreen({
  artist,
  deal,
  endsAt,
  strokes,
  onStrokesChange,
  onGuessed,
  onTimeUp,
}: {
  artist: Player;
  deal: Deal;
  endsAt: number;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onGuessed: () => void;
  onTimeUp: () => void;
}) {
  const { left } = useTimeLeft(endsAt, onTimeUp);
  const category = categoryOf(deal);

  return (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
      <div className="flex w-full items-center gap-2">
        <Avatar player={artist} size="sm" />
        <p className="flex-1 truncate text-left text-xl font-bold text-ink">{artist.name} is drawing</p>
        <TimePill left={left} />
      </div>
      <p className="rounded-full bg-white px-4 py-1 text-lg font-semibold text-ink shadow-sm">
        {category.emoji} {category.name}
      </p>

      <DrawingPad strokes={strokes} onChange={onStrokesChange} />

      <div className="mt-auto w-full pt-1">
        <BigButton onClick={onGuessed}>Someone guessed it! 🎉</BigButton>
      </div>
    </div>
  );
}

/* ---------- Reveal the word ---------- */

function TurnEndScreen({
  artist,
  guesser,
  deal,
  strokes,
  rows,
  nextLabel,
  onNext,
}: {
  artist: Player;
  guesser: Player | null;
  deal: Deal;
  strokes: Stroke[];
  rows: ReturnType<typeof rankByScore>;
  nextLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {guesser ? (
        <>
          <p className="pt-2 text-3xl font-bold text-teal">🎉 {guesser.name} got it!</p>
          <p className="text-lg font-semibold text-ink/60">
            +1 for {guesser.name} · +1 for {artist.name}
          </p>
        </>
      ) : (
        <>
          <p className="pt-2 text-3xl font-bold text-coral">⏰ Time&apos;s up!</p>
          <p className="text-lg font-semibold text-ink/60">No points this time</p>
        </>
      )}

      <div className="animate-pop flex w-full items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
        <Picture strokes={strokes} className="w-32 border-2 border-ink/10" />
        <div className="flex-1">
          <p className="text-lg font-semibold text-ink/50">It was</p>
          <p className="text-4xl font-bold text-ink">
            {deal.word.text} {deal.word.emoji}
          </p>
        </div>
      </div>

      <Scoreboard rows={rows} gains={guesser ? { [guesser.id]: "+1", [artist.id]: "+1" } : {}} />

      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}

/* ---------- Final ---------- */

function FinalScreen({
  rows,
  gallery,
  byId,
  onPlayAgain,
  onSetup,
}: {
  rows: ReturnType<typeof rankByScore>;
  gallery: Drawing[];
  byId: Map<string, Player>;
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <Winners rows={rows} />
      <Scoreboard rows={rows} />

      <section className="w-full rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">🖼️ The art gallery</h2>
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((d, i) => (
            <figure key={i} className="flex flex-col items-center gap-1">
              <Picture strokes={d.strokes} className="w-full border-2 border-ink/10" />
              <figcaption className="w-full truncate text-base font-semibold text-ink">
                {d.word.text} · <span className="text-ink/50">{byId.get(d.artistId)?.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or words
        </BigButton>
      </div>
    </div>
  );
}
