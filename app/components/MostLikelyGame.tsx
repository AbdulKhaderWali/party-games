"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  MIN_PLAYERS,
  QUESTION_OPTIONS,
  dealPrompts,
  loadSettings,
  saveSettings,
  tally,
  type Answer,
  type Settings,
} from "@/lib/most-likely";
import { PROMPT_PACKS } from "@/lib/most-likely-prompts";
import type { Player } from "@/lib/players";
import { ding, tick, unlockSound } from "@/lib/sound";
import type { Word } from "@/lib/words";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  HomeLink,
  PlayersSection,
  QuitBar,
  startLabel,
  usePlayers,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "ask" }
  | { name: "countdown" }
  | { name: "pick" }
  | { name: "reveal" }
  | { name: "final" };

export default function MostLikelyGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [prompts, setPrompts] = useState<Word[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const recentPrompts = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    const next = dealPrompts(settings.categoryIds, settings.questions, recentPrompts.current);
    recentPrompts.current = [...next.map((w) => w.text), ...recentPrompts.current].slice(0, 60);
    setPrompts(next);
    setAnswers([]);
    setPhase({ name: "ask" });
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

  const index = answers.length;
  const isLast = index >= prompts.length - 1;
  const caption = `Question ${Math.min(index + 1, prompts.length)} of ${prompts.length}`;

  function answer(winners: string[]) {
    setAnswers([...answers, { prompt: prompts[index], winners }]);
    setPhase(winners.length ? { name: "reveal" } : isLast ? { name: "final" } : { name: "ask" });
  }

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "ask" && (
        <AskScreen
          caption={caption}
          prompt={prompts[index]}
          onPoint={() => {
            unlockSound();
            setPhase({ name: "countdown" });
          }}
        />
      )}

      {phase.name === "countdown" && <CountdownScreen onDone={() => setPhase({ name: "pick" })} />}

      {phase.name === "pick" && <PickScreen prompt={prompts[index]} players={players} onDone={answer} />}

      {phase.name === "reveal" && (
        <RevealScreen
          answer={answers[answers.length - 1]}
          players={players}
          nextLabel={answers.length >= prompts.length ? "See the awards 🏆" : "Next question ➜"}
          onNext={() => setPhase(answers.length >= prompts.length ? { name: "final" } : { name: "ask" })}
        />
      )}

      {phase.name === "final" && (
        <FinalScreen
          answers={answers}
          players={players}
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

function PromptText({ prompt, size = "lg" }: { prompt: Word; size?: "md" | "lg" }) {
  return (
    <p className={`font-bold leading-tight text-ink ${size === "lg" ? "text-4xl" : "text-2xl"}`}>…{prompt.text}?</p>
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
          👉
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Who&apos;s Most Likely To…</h1>
        <p className="mt-1 text-lg text-ink/60">Read it out. Count to 3. Everyone points!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        title="Questions"
        categories={PROMPT_PACKS}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-ink">How many questions?</h2>
        <div className="grid grid-cols-4 gap-2">
          {QUESTION_OPTIONS.map((q) => {
            const on = settings.questions === q;
            return (
              <button
                key={q}
                onClick={() => update({ questions: q })}
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

      <div className="mt-auto pt-2">
        <BigButton onClick={onStart} disabled={players.length < MIN_PLAYERS}>
          {startLabel(players.length, MIN_PLAYERS)}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- Read the question out loud ---------- */

function AskScreen({ caption, prompt, onPoint }: { caption: string; prompt: Word; onPoint: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <div key={prompt.text} className="animate-pop flex w-full flex-col items-center gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-2xl font-semibold text-ink/60">Who&apos;s most likely to…</p>
        {prompt.emoji && (
          <span className="text-9xl" aria-hidden>
            {prompt.emoji}
          </span>
        )}
        <PromptText prompt={prompt} />
      </div>
      <p className="text-lg text-ink/60">Read it out loud, then everyone points on 3!</p>
      <div className="mt-auto w-full">
        <BigButton onClick={onPoint}>3… 2… 1… Point! 👉</BigButton>
      </div>
    </div>
  );
}

/* ---------- 3, 2, 1, point! ---------- */

const COUNTDOWN = ["3", "2", "1", "👉"];

function CountdownScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    if (step < COUNTDOWN.length - 1) tick();
    else ding();
    const id = setTimeout(() => (step < COUNTDOWN.length - 1 ? setStep(step + 1) : done()), step < 3 ? 800 : 1200);
    return () => clearTimeout(id);
  }, [step]);

  const pointing = step === COUNTDOWN.length - 1;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" role="timer">
      <span key={step} className={`animate-pop font-bold text-ink ${pointing ? "text-[10rem]" : "text-[12rem] tabular-nums"}`}>
        {COUNTDOWN[step]}
      </span>
      {pointing && <p className="text-5xl font-bold text-coral">POINT!</p>}
    </div>
  );
}

/* ---------- Who got the most fingers? ---------- */

function PickScreen({
  prompt,
  players,
  onDone,
}: {
  prompt: Word;
  players: Player[];
  onDone: (winners: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(id: string) {
    setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <div>
        <p className="text-3xl font-bold text-ink">Who got the most fingers?</p>
        <p className="mt-1 text-lg text-ink/60">It&apos;s a tie? Tap them all!</p>
      </div>
      <p className="w-full rounded-2xl bg-white px-4 py-3 text-lg font-semibold text-ink/70 shadow-sm">
        {prompt.emoji} Most likely to {prompt.text}
      </p>
      <div className="grid w-full grid-cols-2 gap-3">
        {players.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              aria-pressed={on}
              className={`relative flex flex-col items-center gap-2 rounded-3xl border-4 p-4 shadow-sm transition-colors active:scale-95 ${
                on ? "border-sun bg-sun/25" : "border-transparent bg-white"
              }`}
            >
              {on && (
                <span className="absolute right-2 top-1 text-3xl" aria-hidden>
                  👑
                </span>
              )}
              <Avatar player={p} />
              <span className="w-full truncate text-xl font-bold text-ink">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto flex w-full flex-col gap-3 pt-2">
        <BigButton onClick={() => onDone(picked)} disabled={!picked.length}>
          That&apos;s them! 👑
        </BigButton>
        <button onClick={() => onDone([])} className="py-2 text-lg font-semibold text-ink/50">
          Skip this one ⏭
        </button>
      </div>
    </div>
  );
}

/* ---------- Crown the winner ---------- */

function RevealScreen({
  answer,
  players,
  nextLabel,
  onNext,
}: {
  answer: Answer;
  players: Player[];
  nextLabel: string;
  onNext: () => void;
}) {
  const winners = players.filter((p) => answer.winners.includes(p.id));
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className="flex flex-wrap justify-center gap-6">
        {winners.map((p) => (
          <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
            <span className="text-6xl" aria-hidden>
              👑
            </span>
            <Avatar player={p} size={winners.length > 2 ? "md" : "xl"} />
            <span className="text-4xl font-bold text-coral">{p.name}</span>
          </div>
        ))}
      </div>
      <p className="text-2xl font-semibold text-ink/60">{winners.length > 1 ? "are" : "is"} most likely to…</p>
      <PromptText prompt={answer.prompt} />
      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}

/* ---------- Awards ---------- */

function FinalScreen({
  answers,
  players,
  onPlayAgain,
  onSetup,
}: {
  answers: Answer[];
  players: Player[];
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  const rows = tally(answers, players);
  const top = rows[0]?.score ?? 0;
  const champions = top > 0 ? rows.filter((r) => r.score === top).map((r) => r.player) : [];
  const byId = new Map(players.map((p) => [p.id, p]));
  const crowned = answers.filter((a) => a.winners.length);

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      {champions.length ? (
        <>
          <p className="pt-4 text-3xl font-bold text-ink">🏆 Picked the most</p>
          <div className="flex flex-wrap justify-center gap-6">
            {champions.map((p) => (
              <div key={p.id} className="animate-pop flex flex-col items-center gap-2">
                <Avatar player={p} size="xl" />
                <span className="text-4xl font-bold text-coral">{p.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xl font-semibold text-ink/60">
            {top} crown{top === 1 ? "" : "s"} 👑
          </p>
        </>
      ) : (
        <p className="pt-4 text-3xl font-bold text-ink">No crowns this time! 🙃</p>
      )}

      {crowned.length > 0 && (
        <section className="w-full rounded-3xl bg-white p-3 text-left shadow-sm">
          <h2 className="px-2 pb-2 text-xl font-bold text-ink">The awards</h2>
          <ul className="flex flex-col gap-2">
            {crowned.map((a) => (
              <li key={a.prompt.text} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
                <span className="flex shrink-0 -space-x-3">
                  {a.winners.map((id) => (
                    <Avatar key={id} player={byId.get(id)!} size="sm" />
                  ))}
                </span>
                <span className="flex-1 text-base text-ink">
                  <b>{a.winners.map((id) => byId.get(id)!.name).join(" & ")}</b>: most likely to {a.prompt.text}{" "}
                  {a.prompt.emoji}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or questions
        </BigButton>
      </div>
    </div>
  );
}
