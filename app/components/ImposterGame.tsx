"use client";

import { useEffect, useRef, useState } from "react";
import {
  MIN_PLAYERS,
  dealRound,
  loadSettings,
  maxImposters,
  saveSettings,
  type Round,
  type Settings,
} from "@/lib/game";
import type { Player } from "@/lib/players";
import { CATEGORIES } from "@/lib/words";
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
  | { name: "pass"; index: number }
  | { name: "card"; index: number }
  | { name: "start" }
  | { name: "result" };

export default function ImposterGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [round, setRound] = useState<Round | null>(null);
  const recentWords = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startRound() {
    const next = dealRound(settings, players.length, recentWords.current);
    recentWords.current = [next.word.text, ...recentWords.current].slice(0, 15);
    setRound(next);
    setPhase({ name: "pass", index: 0 });
  }

  function quit() {
    if (confirm("Stop this round and go back to setup?")) setPhase({ name: "setup" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">
      {phase.name !== "setup" && phase.name !== "result" && <QuitBar onQuit={quit} />}

      {phase.name === "setup" && (
        <Setup
          players={players}
          onPlayersChange={setPlayers}
          settings={settings}
          onChange={setSettings}
          onStart={startRound}
        />
      )}

      {phase.name === "pass" && (
        <PassScreen
          player={players[phase.index]}
          caption={`Card ${phase.index + 1} of ${players.length}`}
          onReady={() => setPhase({ name: "card", index: phase.index })}
        />
      )}

      {phase.name === "card" && round && (
        <CardScreen
          key={phase.index}
          player={players[phase.index]}
          round={round}
          isImposter={round.imposters.includes(phase.index)}
          isLast={phase.index === players.length - 1}
          onDone={() =>
            setPhase(
              phase.index === players.length - 1
                ? { name: "start" }
                : { name: "pass", index: phase.index + 1 },
            )
          }
        />
      )}

      {phase.name === "start" && round && (
        <StartScreen
          player={players[round.starter]}
          imposterCount={round.imposters.length}
          onReveal={() => setPhase({ name: "result" })}
        />
      )}

      {phase.name === "result" && round && (
        <ResultScreen
          round={round}
          players={players}
          onPlayAgain={startRound}
          onSetup={() => setPhase({ name: "setup" })}
        />
      )}
    </main>
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
  const { categoryIds, imposterCount } = settings;
  const maxImp = maxImposters(players.length);
  const imposters = Math.min(imposterCount, maxImp);

  function update(patch: Partial<Settings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HomeLink />
      <header className="text-center">
        <div className="text-6xl" aria-hidden>
          🕵️
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Guess the Imposter</h1>
        <p className="mt-1 text-lg text-ink/60">Pass the phone. Find the faker!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        categories={CATEGORIES}
        selected={categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <section className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-ink">Imposters</h2>
        <div className="flex items-center gap-3">
          <Stepper label="Fewer imposters" disabled={imposters <= 1} onClick={() => update({ imposterCount: imposters - 1 })}>
            −
          </Stepper>
          <span className="w-8 text-center text-3xl font-bold text-ink">{imposters}</span>
          <Stepper label="More imposters" disabled={imposters >= maxImp} onClick={() => update({ imposterCount: imposters + 1 })}>
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

/* ---------- Hold-to-reveal card ---------- */

function CardScreen({
  player,
  round,
  isImposter,
  isLast,
  onDone,
}: {
  player: Player;
  round: Round;
  isImposter: boolean;
  isLast: boolean;
  onDone: () => void;
}) {
  const [seen, setSeen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3">
        <Avatar player={player} size="sm" />
        <p className="text-2xl font-bold text-ink">{player.name}&apos;s card</p>
      </div>

      <HoldCard
        onSeen={() => setSeen(true)}
        backClassName={isImposter ? "bg-imposter text-white" : "bg-white text-ink"}
        back={
          isImposter ? (
            <>
              <span className="text-8xl" aria-hidden>
                🕵️
              </span>
              <span className="text-4xl font-bold leading-tight">You are the Imposter!</span>
              <span className="text-lg opacity-80">Pretend you know the word 🤫</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold text-ink/50">The secret word is</span>
              {round.word.emoji && (
                <span className="text-9xl" aria-hidden>
                  {round.word.emoji}
                </span>
              )}
              <span className="text-5xl font-bold">{round.word.text}</span>
            </>
          )
        }
      />

      <div className="mt-auto w-full">
        {seen ? (
          <BigButton onClick={onDone}>{isLast ? "Everyone's ready! 🎉" : "Done – pass the phone ➜"}</BigButton>
        ) : (
          <p className="py-5 text-xl text-ink/50">Hold the card, then let go to hide it.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Who starts ---------- */

function StartScreen({
  player,
  imposterCount,
  onReveal,
}: {
  player: Player;
  imposterCount: number;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <p className="text-3xl font-bold text-ink">Everyone has seen their card!</p>
      <div className="animate-pop">
        <Avatar player={player} size="xl" />
      </div>
      <p className="text-5xl font-bold text-coral">{player.name} starts!</p>
      <div className="w-full rounded-3xl bg-white p-5 text-left text-lg text-ink shadow-sm">
        <p className="mb-2 font-bold">How to play</p>
        <ol className="flex flex-col gap-1.5">
          <li>🗣️ Take turns going around the circle ↻</li>
          <li>💡 Say <b>one word</b> about the secret word</li>
          <li>🚫 Don&apos;t say the secret word itself!</li>
          <li>
            🕵️ Then point at who you think {imposterCount > 1 ? "the imposters are" : "the imposter is"}
          </li>
        </ol>
      </div>
      <div className="mt-auto w-full">
        <BigButton onClick={onReveal}>Reveal the Imposter{imposterCount > 1 ? "s" : ""} 🔍</BigButton>
      </div>
    </div>
  );
}

/* ---------- Result ---------- */

function ResultScreen({
  round,
  players,
  onPlayAgain,
  onSetup,
}: {
  round: Round;
  players: Player[];
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  const imposters = round.imposters.map((i) => players[i]);
  const plural = imposters.length > 1;
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="pt-4 text-3xl font-bold text-ink">The imposter{plural ? "s were" : " was"}…</p>
      <div className="flex flex-wrap justify-center gap-6">
        {imposters.map((p) => (
          <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
            <Avatar player={p} size="xl" />
            <span className="text-4xl font-bold text-imposter">{p.name}</span>
          </div>
        ))}
      </div>
      <div className="w-full rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-lg font-semibold text-ink/50">The secret word was</p>
        <p className="mt-1 text-4xl font-bold text-ink">
          {round.word.emoji} {round.word.text}
        </p>
      </div>
      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or words
        </BigButton>
      </div>
    </div>
  );
}
