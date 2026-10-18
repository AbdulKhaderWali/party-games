"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { ding, tick } from "@/lib/sound";
import { AVATARS, MAX_PLAYERS, loadPlayers, nextFreeAvatar, savePlayers, type Player } from "@/lib/players";
import type { Category } from "@/lib/words";

/** The player list shared by every game, kept in localStorage. */
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>(loadPlayers);
  useEffect(() => savePlayers(players), [players]);
  return [players, setPlayers] as const;
}

export function Avatar({ player, size = "md" }: { player: Player; size?: "sm" | "md" | "xl" }) {
  const a = AVATARS[player.avatar % AVATARS.length];
  const sizes = { sm: "size-11 text-2xl", md: "size-16 text-4xl", xl: "size-40 text-8xl" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-4 ring-white ${sizes[size]}`}
      style={{ backgroundColor: a.color }}
      aria-hidden
    >
      {a.emoji}
    </span>
  );
}

export function BigButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-coral text-white shadow-[0_6px_0_#c94a2f] active:translate-y-1.5 active:shadow-none"
      : "bg-white text-ink shadow-[0_6px_0_#e3d6bf] active:translate-y-1.5 active:shadow-none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-3xl px-6 py-5 text-2xl font-bold transition-transform disabled:opacity-40 disabled:shadow-none ${styles}`}
    >
      {children}
    </button>
  );
}

export function Stepper({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="size-12 rounded-full bg-cream text-3xl font-bold text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Back-to-games link shown on setup screens. */
export function HomeLink() {
  return (
    <div className="flex">
      <Link href="/" className="rounded-full px-3 py-1 text-sm font-semibold text-ink/60">
        ← All games
      </Link>
    </div>
  );
}

export function QuitBar({ onQuit, dark }: { onQuit: () => void; dark?: boolean }) {
  return (
    <div className="mb-2 flex justify-end">
      <button
        onClick={onQuit}
        className={`rounded-full px-3 py-1 text-sm font-semibold ${dark ? "text-white/60" : "text-ink/60"}`}
      >
        ✕ Quit
      </button>
    </div>
  );
}

/* ---------- Setup sections ---------- */

export function PlayersSection({
  players,
  onChange,
}: {
  players: Player[];
  onChange: (players: Player[]) => void;
}) {
  const [name, setName] = useState("");

  function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || players.length >= MAX_PLAYERS) return;
    onChange([...players, { id: crypto.randomUUID(), name: trimmed, avatar: nextFreeAvatar(players) }]);
    setName("");
  }

  function cycleAvatar(id: string) {
    onChange(players.map((p) => (p.id === id ? { ...p, avatar: (p.avatar + 1) % AVATARS.length } : p)));
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-ink">
        Players <span className="text-ink/40">({players.length})</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
            <button onClick={() => cycleAvatar(p.id)} aria-label={`Change ${p.name}'s animal`}>
              <Avatar player={p} size="sm" />
            </button>
            <span className="flex-1 truncate text-xl font-semibold text-ink">{p.name}</span>
            <button
              onClick={() => onChange(players.filter((x) => x.id !== p.id))}
              className="size-10 rounded-full text-xl text-ink/40"
              aria-label={`Remove ${p.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addPlayer} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a name"
          maxLength={16}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-2xl border-2 border-ink/10 bg-cream px-4 py-3 text-xl text-ink outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={!name.trim() || players.length >= MAX_PLAYERS}
          className="rounded-2xl bg-teal px-5 text-xl font-bold text-white disabled:opacity-40"
        >
          Add
        </button>
      </form>
      {players.length > 0 && <p className="mt-2 text-sm text-ink/50">Tap an animal to change it.</p>}
    </section>
  );
}

export function CategoryPicker({
  categories,
  selected,
  onChange,
  title = "Words",
}: {
  categories: Pick<Category, "id" | "name" | "emoji">[];
  selected: string[];
  onChange: (ids: string[]) => void;
  title?: string;
}) {
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
    if (next.length) onChange(next);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-ink">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-lg font-semibold transition-colors ${
                on ? "border-sun bg-sun/25 text-ink" : "border-ink/10 bg-cream text-ink/50"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {c.emoji}
              </span>
              <span className="flex-1">{c.name}</span>
              {on && <span aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A row of number buttons, e.g. how many questions or rounds. */
export function NumberChoice({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: number[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-ink">{title}</h2>
      <div className="grid grid-cols-4 gap-2">
        {options.map((q) => {
          const on = value === q;
          return (
            <button
              key={q}
              onClick={() => onChange(q)}
              aria-pressed={on}
              className={`rounded-2xl border-2 py-3 text-xl font-bold transition-colors ${
                on ? "border-sun bg-sun/25 text-ink" : "border-ink/10 bg-cream text-ink/50"
              }`}
            >
              {q}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function startLabel(playerCount: number, minPlayers: number) {
  const missing = minPlayers - playerCount;
  return missing <= 0 ? "Start game ▶" : `Add ${missing} more player${missing === 1 ? "" : "s"}`;
}

/* ---------- Pass the phone ---------- */

export function PassScreen({
  player,
  caption,
  onReady,
}: {
  player: Player;
  caption: string;
  onReady: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <p className="text-3xl font-bold text-ink">Give the phone to</p>
      <div className="animate-pop">
        <Avatar player={player} size="xl" />
      </div>
      <p className="text-5xl font-bold text-ink">{player.name}</p>
      <p className="text-lg text-ink/60">Don&apos;t let anyone else peek! 🙈</p>
      <div className="mt-auto w-full">
        <BigButton onClick={onReady}>I&apos;m {player.name} 👋</BigButton>
      </div>
    </div>
  );
}

/* ---------- Hold-to-reveal card ---------- */

/** A card that flips to show `back` only while pressed. Calls `onSeen` after the first look. */
export function HoldCard({
  back,
  backClassName,
  onSeen,
}: {
  back: React.ReactNode;
  backClassName: string;
  onSeen: () => void;
}) {
  const [holding, setHolding] = useState(false);

  function press() {
    setHolding(true);
  }
  function release() {
    if (holding) onSeen();
    setHolding(false);
  }

  return (
    <button
      className="card-scene relative aspect-[3/4] w-full max-w-xs touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          press();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Press and hold to see your card"
    >
      <div className={`card-inner ${holding ? "is-flipped" : ""}`}>
        <div className="card-face flex flex-col items-center justify-center gap-4 bg-purple text-white">
          <span className="text-8xl" aria-hidden>
            👆
          </span>
          <span className="px-6 text-3xl font-bold">Press &amp; hold to see your card</span>
        </div>
        <div className={`card-face card-back flex flex-col items-center justify-center gap-3 px-4 ${backClassName}`}>
          {holding && back}
        </div>
      </div>
    </button>
  );
}

/* ---------- 3, 2, 1, go! ---------- */

/** Keeps the screen on while mounted, e.g. while a timer runs. */
export function useWakeLock() {
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

/** Counts 3, 2, 1 with beeps, flashes `go` and `label`, then calls `onDone`. */
export function Countdown({ go, label, onDone }: { go: string; label: string; onDone: () => void }) {
  const steps = ["3", "2", "1", go];
  const [step, setStep] = useState(0);
  const done = useEffectEvent(onDone);
  const last = steps.length - 1;

  useEffect(() => {
    if (step < last) tick();
    else ding();
    const id = setTimeout(() => (step < last ? setStep(step + 1) : done()), step < last ? 800 : 1200);
    return () => clearTimeout(id);
  }, [step, last]);

  const going = step === last;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" role="timer">
      <span key={step} className={`animate-pop font-bold text-ink ${going ? "text-[10rem]" : "text-[12rem] tabular-nums"}`}>
        {steps[step]}
      </span>
      {going && <p className="text-5xl font-bold text-coral">{label}</p>}
    </div>
  );
}
