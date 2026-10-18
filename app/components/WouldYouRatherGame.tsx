"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/players";
import { unlockSound } from "@/lib/sound";
import {
  MIN_PLAYERS,
  QUESTION_OPTIONS,
  brainTwins,
  dealDilemmas,
  dilemmaKeys,
  freeSpirit,
  loadSettings,
  saveSettings,
  type Answer,
  type Choice,
  type Settings,
} from "@/lib/would-you-rather";
import { DILEMMA_PACKS, type Dilemma } from "@/lib/would-you-rather-prompts";
import type { Word } from "@/lib/words";
import {
  Avatar,
  BigButton,
  CategoryPicker,
  Countdown,
  HomeLink,
  NumberChoice,
  PlayersSection,
  QuitBar,
  startLabel,
  usePlayers,
} from "./shared";

type Phase =
  | { name: "setup" }
  | { name: "ask" }
  | { name: "countdown" }
  | { name: "vote" }
  | { name: "reveal" }
  | { name: "final" };

const SIDE = {
  a: { bg: "bg-coral", text: "text-coral", border: "border-coral", label: "🅰️" },
  b: { bg: "bg-teal", text: "text-teal", border: "border-teal", label: "🅱️" },
};

export default function WouldYouRatherGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [dilemmas, setDilemmas] = useState<Dilemma[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const recent = useRef<string[]>([]);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    const next = dealDilemmas(settings.categoryIds, settings.questions, recent.current);
    recent.current = [...dilemmaKeys(next), ...recent.current].slice(0, 40);
    setDilemmas(next);
    setAnswers([]);
    setPhase({ name: "ask" });
  }

  function quit() {
    if (confirm("Stop this game and go back to setup?")) setPhase({ name: "setup" });
  }

  if (phase.name === "setup" || !dilemmas.length) {
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
  const done = answers.length >= dilemmas.length;

  return (
    <Shell>
      {phase.name !== "final" && <QuitBar onQuit={quit} />}

      {phase.name === "ask" && (
        <AskScreen
          caption={`Question ${index + 1} of ${dilemmas.length}`}
          dilemma={dilemmas[index]}
          onVote={() => {
            unlockSound();
            setPhase({ name: "countdown" });
          }}
        />
      )}

      {phase.name === "countdown" && <Countdown go="🤔" label="PICK!" onDone={() => setPhase({ name: "vote" })} />}

      {phase.name === "vote" && (
        <VoteScreen
          dilemma={dilemmas[index]}
          players={players}
          onDone={(votes) => {
            setAnswers([...answers, { dilemma: dilemmas[index], votes }]);
            setPhase({ name: "reveal" });
          }}
        />
      )}

      {phase.name === "reveal" && (
        <RevealScreen
          answer={answers[answers.length - 1]}
          players={players}
          nextLabel={done ? "See the results 🏆" : "Next question ➜"}
          onNext={() => setPhase(done ? { name: "final" } : { name: "ask" })}
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
          🤔
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Would You Rather</h1>
        <p className="mt-1 text-lg text-ink/60">Two choices. Pick one. Explain yourself!</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <CategoryPicker
        title="Questions"
        categories={DILEMMA_PACKS}
        selected={settings.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
      />

      <NumberChoice
        title="How many questions?"
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

/* ---------- Read it out ---------- */

function OptionCard({ side, option }: { side: Choice; option: Word }) {
  return (
    <div className={`flex w-full flex-col items-center gap-2 rounded-3xl p-5 text-white shadow-sm ${SIDE[side].bg}`}>
      {option.emoji && (
        <span className="text-7xl" aria-hidden>
          {option.emoji}
        </span>
      )}
      <span className="text-3xl font-bold leading-tight">{option.text}</span>
    </div>
  );
}

function AskScreen({ caption, dilemma, onVote }: { caption: string; dilemma: Dilemma; onVote: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-ink/50">{caption}</p>
      <p className="text-3xl font-bold text-ink">Would you rather…</p>
      <div key={dilemma.a.text} className="animate-pop flex w-full flex-col items-center gap-3">
        <OptionCard side="a" option={dilemma.a} />
        <span className="rounded-full bg-white px-5 py-1 text-2xl font-bold text-ink shadow-sm">OR</span>
        <OptionCard side="b" option={dilemma.b} />
      </div>
      <p className="text-lg text-ink/60">Read it out loud. On 3, point to your pick!</p>
      <div className="mt-auto w-full">
        <BigButton onClick={onVote}>3… 2… 1… Pick! 🤔</BigButton>
      </div>
    </div>
  );
}

/* ---------- Who picked what ---------- */

function VoteScreen({
  dilemma,
  players,
  onDone,
}: {
  dilemma: Dilemma;
  players: Player[];
  onDone: (votes: Record<string, Choice>) => void;
}) {
  const [votes, setVotes] = useState<Record<string, Choice>>({});

  function vote(id: string, choice: Choice) {
    const next = { ...votes };
    if (next[id] === choice) delete next[id];
    else next[id] = choice;
    setVotes(next);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <p className="text-3xl font-bold text-ink">Who picked what?</p>
      <div className="grid w-full grid-cols-2 gap-2 text-white">
        {(["a", "b"] as const).map((side) => (
          <p key={side} className={`rounded-2xl px-3 py-2 text-lg font-bold leading-tight ${SIDE[side].bg}`}>
            {dilemma[side].emoji} {dilemma[side].text}
          </p>
        ))}
      </div>
      <ul className="flex w-full flex-col gap-2">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white px-2 py-2 shadow-sm">
            <Avatar player={p} size="sm" />
            <span className="flex-1 truncate text-left text-xl font-semibold text-ink">{p.name}</span>
            {(["a", "b"] as const).map((side) => {
              const on = votes[p.id] === side;
              return (
                <button
                  key={side}
                  onClick={() => vote(p.id, side)}
                  aria-pressed={on}
                  aria-label={`${p.name} picked ${dilemma[side].text}`}
                  className={`size-14 rounded-2xl border-4 text-3xl transition-colors active:scale-95 ${
                    on ? `${SIDE[side].border} ${SIDE[side].bg}` : "border-ink/10 bg-cream opacity-60"
                  }`}
                >
                  {dilemma[side].emoji ?? SIDE[side].label}
                </button>
              );
            })}
          </li>
        ))}
      </ul>
      <div className="mt-auto w-full pt-2">
        <BigButton onClick={() => onDone(votes)} disabled={!Object.keys(votes).length}>
          Show the results 📊
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- The split ---------- */

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
  const { dilemma, votes } = answer;
  const team = (side: Choice) => players.filter((p) => votes[p.id] === side);
  const [teamA, teamB] = [team("a"), team("b")];
  const total = teamA.length + teamB.length;
  const share = total ? teamA.length / total : 0.5;

  let message: string;
  if (!teamA.length || !teamB.length) message = "Everyone agrees! 🤝";
  else if (teamA.length === teamB.length) message = "It's a tie! Time to debate 🗣️";
  else {
    const smaller = teamA.length < teamB.length ? "a" : "b";
    message = `${dilemma[smaller].emoji ?? ""} team, tell everyone why!`;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="pt-2 text-3xl font-bold text-ink">{message}</p>

      <div className="flex h-12 w-full overflow-hidden rounded-full bg-white text-xl font-bold text-white shadow-sm">
        {teamA.length > 0 && (
          <div className="grid place-items-center bg-coral transition-all" style={{ width: `${share * 100}%` }}>
            {teamA.length}
          </div>
        )}
        {teamB.length > 0 && (
          <div className="grid flex-1 place-items-center bg-teal transition-all">{teamB.length}</div>
        )}
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => (
          <div key={side} className="flex flex-col items-center gap-3 rounded-3xl bg-white p-3 shadow-sm">
            <p className={`text-lg font-bold leading-tight ${SIDE[side].text}`}>
              {dilemma[side].emoji} {dilemma[side].text}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {team(side).map((p) => (
                <div key={p.id} className="animate-pop flex w-16 flex-col items-center">
                  <Avatar player={p} size="sm" />
                  <span className="w-full truncate text-sm font-semibold text-ink">{p.name}</span>
                </div>
              ))}
              {!team(side).length && <span className="text-3xl" aria-label="Nobody">🦗</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{nextLabel}</BigButton>
      </div>
    </div>
  );
}

/* ---------- Results ---------- */

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
  const twins = brainTwins(answers, players);
  const spirit = freeSpirit(answers, players);

  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="pt-4 text-3xl font-bold text-ink">The results are in! 🎉</p>

      {twins && (
        <section className="animate-pop w-full rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-ink">🧠 Brain twins</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            {twins.pair.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <Avatar player={p} />
                <span className="text-xl font-bold text-coral">{p.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-lg text-ink/60">
            Picked the same thing {twins.same} out of {twins.both} time{twins.both === 1 ? "" : "s"}
          </p>
        </section>
      )}

      {spirit && (
        <section className="animate-pop w-full rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-ink">🦄 Free spirit</p>
          <div className="mt-3 flex flex-col items-center gap-1">
            <Avatar player={spirit.player} />
            <span className="text-xl font-bold text-teal">{spirit.player.name}</span>
          </div>
          <p className="mt-2 text-lg text-ink/60">
            Went against the crowd {spirit.times} time{spirit.times === 1 ? "" : "s"}
          </p>
        </section>
      )}

      {!twins && !spirit && <p className="text-xl text-ink/60">Play a few more questions to unlock awards!</p>}

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or questions
        </BigButton>
      </div>
    </div>
  );
}
