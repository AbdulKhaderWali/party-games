"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/players";
import { ding, unlockSound } from "@/lib/sound";
import {
  MAX_ROUNDS,
  MIN_PLAYERS,
  dealCard,
  loadSettings,
  newMatch,
  ranked,
  saveSettings,
  type Kind,
  type Match,
  type Settings,
} from "@/lib/truth-or-dare";
import { TOD_PACKS } from "@/lib/truth-or-dare-prompts";
import type { Word } from "@/lib/words";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HomeLink,
  PlayersSection,
  QuitBar,
  Stepper,
  startLabel,
  usePlayers,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "choose" }
  | { name: "card"; kind: Kind; card: Word }
  | { name: "final" };

export default function TruthOrDareGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [match, setMatch] = useState<Match | null>(null);
  const recentCards = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    setMatch(newMatch(players));
    setPhase({ name: "choose" });
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
  const player = byId.get(match.order[match.turn % n])!;
  const isLastTurn = match.turn >= n * settings.rounds - 1;

  function choose(kind: Kind) {
    const card = dealCard(settings.categoryIds, kind, [...match!.used, ...recentCards.current]);
    recentCards.current = [card.text, ...recentCards.current].slice(0, 40);
    setMatch({ ...match!, used: [...match!.used, card.text] });
    setPhase({ name: "card", kind, card });
  }

  function finish(didIt: boolean) {
    const stars = didIt ? { ...match!.stars, [player.id]: (match!.stars[player.id] ?? 0) + 1 } : match!.stars;
    if (didIt) {
      unlockSound();
      ding();
    }
    setMatch({ ...match!, stars, turn: isLastTurn ? match!.turn : match!.turn + 1 });
    setPhase(isLastTurn ? { name: "final" } : { name: "choose" });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "choose" && (
        <ChooseScreen
          caption={`Round ${Math.floor(match.turn / n) + 1} of ${settings.rounds} · Turn ${(match.turn % n) + 1} of ${n}`}
          player={player}
          stars={match.stars[player.id] ?? 0}
          onChoose={choose}
        />
      )}

      {phase.name === "card" && (
        <CardScreen player={player} kind={phase.kind} card={phase.card} onDone={finish} />
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
          🎲
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Truth or Dare</h1>
        <p className="mt-1 text-lg text-ink/60">Kind truths and silly dares. Earn a ⭐ for each one!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        title="Cards"
        categories={TOD_PACKS}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <section className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-ink">Turns each</h2>
        <div className="flex items-center gap-3">
          <Stepper label="Fewer turns" disabled={settings.rounds <= 1} onClick={() => update({ rounds: settings.rounds - 1 })}>
            −
          </Stepper>
          <span className="w-8 text-center text-3xl font-bold text-ink">{settings.rounds}</span>
          <Stepper
            label="More turns"
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

/* ---------- Truth or dare? ---------- */

function ChooseScreen({
  caption,
  player,
  stars,
  onChoose,
}: {
  caption: string;
  player: Player;
  stars: number;
  onChoose: (kind: Kind) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <div key={player.id} className="animate-pop">
        <Avatar player={player} size="xl" />
      </div>
      <p className="text-5xl font-bold text-ink">{player.name}</p>
      <p className="text-xl font-semibold text-ink/60">{stars ? "⭐".repeat(Math.min(stars, 10)) : "No stars yet"}</p>
      <p className="text-3xl font-bold text-ink">Truth or dare?</p>
      <div className="mt-auto grid w-full grid-cols-2 gap-3">
        <button
          onClick={() => onChoose("truth")}
          className="flex flex-col items-center gap-2 rounded-3xl bg-purple py-6 text-white shadow-[0_6px_0_#5a3fd6] transition-transform active:translate-y-1.5 active:shadow-none"
        >
          <span className="text-6xl" aria-hidden>
            💬
          </span>
          <span className="text-3xl font-bold">Truth</span>
        </button>
        <button
          onClick={() => onChoose("dare")}
          className="flex flex-col items-center gap-2 rounded-3xl bg-coral py-6 text-white shadow-[0_6px_0_#c94a2f] transition-transform active:translate-y-1.5 active:shadow-none"
        >
          <span className="text-6xl" aria-hidden>
            🎲
          </span>
          <span className="text-3xl font-bold">Dare</span>
        </button>
      </div>
      <button
        onClick={() => onChoose(Math.random() < 0.5 ? "truth" : "dare")}
        className="py-2 text-lg font-semibold text-ink/50"
      >
        Can&apos;t decide? Surprise me 🎁
      </button>
    </div>
  );
}

/* ---------- The card ---------- */

function CardScreen({
  player,
  kind,
  card,
  onDone,
}: {
  player: Player;
  kind: Kind;
  card: Word;
  onDone: (didIt: boolean) => void;
}) {
  const truth = kind === "truth";
  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3">
        <Avatar player={player} size="sm" />
        <p className="text-2xl font-bold text-ink">
          {player.name} picked {truth ? "truth" : "dare"}
        </p>
      </div>
      <div
        key={card.text}
        className={`animate-pop flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-4 rounded-[2rem] px-6 text-white shadow-[0_10px_0_rgb(43_33_64/0.15)] ${
          truth ? "bg-purple" : "bg-coral"
        }`}
      >
        <span className="text-xl font-bold uppercase tracking-widest opacity-80">{truth ? "Truth" : "Dare"}</span>
        {card.emoji && (
          <span className="text-8xl" aria-hidden>
            {card.emoji}
          </span>
        )}
        <span className="text-3xl font-bold leading-tight">{card.text}</span>
      </div>
      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={() => onDone(true)}>Did it! ⭐</BigButton>
        <BigButton variant="secondary" onClick={() => onDone(false)}>
          Pass 🐔
        </BigButton>
      </div>
    </div>
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
  const everyone = winners.length === rows.length;

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {everyone ? (
        <p className="pt-4 text-3xl font-bold text-ink">Everyone&apos;s a superstar! 🌟</p>
      ) : winners.length ? (
        <>
          <p className="pt-4 text-3xl font-bold text-ink">🌟 Bravest of them all</p>
          <div className="flex flex-wrap justify-center gap-6">
            {winners.map((p) => (
              <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
                <Avatar player={p} size={winners.length > 2 ? "md" : "xl"} />
                <span className="text-4xl font-bold text-coral">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="pt-4 text-3xl font-bold text-ink">A flock of chickens! 🐔</p>
      )}

      <ol className="flex w-full flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm">
        {rows.map(({ player, score }) => (
          <li key={player.id} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
            <Avatar player={player} size="sm" />
            <span className="flex-1 truncate text-left text-xl font-semibold text-ink">{player.name}</span>
            <span className="text-2xl font-bold tabular-nums text-ink">{score} ⭐</span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or cards
        </BigButton>
      </div>
    </div>
  );
}
