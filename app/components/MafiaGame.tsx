"use client";

import { useEffect, useState } from "react";
import {
  MIN_PLAYERS,
  ROLES,
  alive,
  aliveWith,
  loadSettings,
  maxMafia,
  newGame,
  nextNight,
  resolveNight,
  saveSettings,
  voteOut,
  winner,
  type Game,
  type NightPicks,
  type Settings,
  type Team,
} from "@/lib/mafia";
import type { Player } from "@/lib/players";
import {
  Avatar,
  BigButton,
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
  | { name: "dealPass"; index: number }
  | { name: "dealCard"; index: number }
  | { name: "nightIntro" }
  | { name: "nightPass"; index: number }
  | { name: "nightTurn"; index: number }
  | { name: "morning"; caught: string | null; saved: boolean }
  | { name: "day" }
  | { name: "vote" }
  | { name: "voteResult"; outId: string | null }
  | { name: "end"; winner: Team };

const NO_PICKS: NightPicks = { mafia: [], save: null };

export default function MafiaGame() {
  const [players, setPlayers] = usePlayers();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [game, setGame] = useState<Game | null>(null);
  const [picks, setPicks] = useState<NightPicks>(NO_PICKS);

  useEffect(() => saveSettings(settings), [settings]);

  function startGame() {
    setGame(newGame(players, settings));
    setPicks(NO_PICKS);
    setPhase({ name: "dealPass", index: 0 });
  }

  function quit() {
    if (confirm("Stop this game and go back to setup?")) setPhase({ name: "setup" });
  }

  if (phase.name === "setup" || !game) {
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
  const seated = game.seats.map((id) => byId.get(id)!);
  const awake = alive(game);
  const isNight = phase.name === "nightIntro" || phase.name === "nightPass" || phase.name === "nightTurn";

  function endTurn(by: string, target: string) {
    const role = game!.roles[by];
    const next =
      role === "mafia"
        ? { ...picks, mafia: [...picks.mafia, { by, target }] }
        : role === "doctor"
          ? { ...picks, save: target }
          : picks;
    const checked =
      role === "detective" ? { ...game!, checks: { ...game!.checks, [target]: game!.roles[target] === "mafia" } } : game!;

    if (phase.name === "nightTurn" && phase.index < awake.length - 1) {
      setPicks(next);
      setGame(checked);
      setPhase({ name: "nightPass", index: phase.index + 1 });
      return;
    }
    const result = resolveNight(checked, next);
    setGame(result.game);
    setPicks(NO_PICKS);
    setPhase({ name: "morning", caught: result.caught, saved: result.saved });
  }

  function afterOut(updated: Game, then: Phase) {
    const won = winner(updated);
    setPhase(won ? { name: "end", winner: won } : then);
  }

  return (
    <Shell>
      {isNight && <div className="fixed inset-0 -z-10 bg-ink" aria-hidden />}
      {phase.name !== "end" && <QuitBar onQuit={quit} dark={isNight} />}

      {phase.name === "dealPass" && (
        <PassScreen
          player={seated[phase.index]}
          caption={`Secret role ${phase.index + 1} of ${seated.length}`}
          onReady={() => setPhase({ name: "dealCard", index: phase.index })}
        />
      )}

      {phase.name === "dealCard" && (
        <RoleCardScreen
          key={phase.index}
          player={seated[phase.index]}
          game={game}
          byId={byId}
          isLast={phase.index === seated.length - 1}
          onDone={() =>
            setPhase(
              phase.index === seated.length - 1 ? { name: "nightIntro" } : { name: "dealPass", index: phase.index + 1 },
            )
          }
        />
      )}

      {phase.name === "nightIntro" && (
        <NightIntro night={game.night} onStart={() => setPhase({ name: "nightPass", index: 0 })} />
      )}

      {phase.name === "nightPass" && (
        <NightPass
          player={byId.get(awake[phase.index])!}
          caption={`Night ${game.night} · Turn ${phase.index + 1} of ${awake.length}`}
          onReady={() => setPhase({ name: "nightTurn", index: phase.index })}
        />
      )}

      {phase.name === "nightTurn" && (
        <NightTurn
          key={awake[phase.index]}
          player={byId.get(awake[phase.index])!}
          game={game}
          picks={picks}
          byId={byId}
          isLast={phase.index === awake.length - 1}
          onDone={(target) => endTurn(awake[phase.index], target)}
        />
      )}

      {phase.name === "morning" && (
        <MorningScreen
          caught={phase.caught ? byId.get(phase.caught)! : null}
          saved={phase.saved}
          game={game}
          revealRoles={settings.revealRoles}
          onNext={() => afterOut(game, { name: "day" })}
        />
      )}

      {phase.name === "day" && (
        <DayScreen game={game} byId={byId} onVote={() => setPhase({ name: "vote" })} />
      )}

      {phase.name === "vote" && (
        <VoteScreen
          candidates={awake.map((id) => byId.get(id)!)}
          onBack={() => setPhase({ name: "day" })}
          onVote={(outId) => {
            if (outId) setGame(voteOut(game, outId));
            setPhase({ name: "voteResult", outId });
          }}
        />
      )}

      {phase.name === "voteResult" && (
        <VoteResultScreen
          out={phase.outId ? byId.get(phase.outId)! : null}
          game={game}
          revealRoles={settings.revealRoles}
          onNext={() => {
            const next = nextNight(game);
            setGame(next);
            afterOut(next, { name: "nightIntro" });
          }}
        />
      )}

      {phase.name === "end" && (
        <EndScreen
          winner={phase.winner}
          game={game}
          players={seated}
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

function RoleChip({ game, id }: { game: Game; id: string }) {
  const role = ROLES[game.roles[id]];
  return (
    <span className={`rounded-full px-3 py-1 text-base font-bold ${role.card}`}>
      {role.emoji} {role.name}
    </span>
  );
}

/* ---------- Setup ---------- */

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-2xl bg-cream px-3 py-3 text-left"
    >
      <span className="flex-1">
        <span className="block text-lg font-semibold text-ink">{label}</span>
        <span className="block text-sm text-ink/50">{hint}</span>
      </span>
      <span className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${on ? "bg-teal" : "bg-ink/20"}`}>
        <span className={`size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : ""}`} />
      </span>
    </button>
  );
}

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
  const max = maxMafia(players.length);
  const mafia = Math.min(settings.mafiaCount, max);

  function update(patch: Partial<Settings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HomeLink />
      <header className="text-center">
        <div className="text-6xl" aria-hidden>
          😈
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Mafia</h1>
        <p className="mt-1 text-lg text-ink/60">Sneaky Mafia vs. the town. Who can you trust?</p>
      </header>

      <PlayersSection players={players} onChange={onPlayersChange} />

      <section className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-ink">😈 Mafia</h2>
          <p className="text-sm text-ink/50">About 1 for every 3–4 players</p>
        </div>
        <div className="flex items-center gap-3">
          <Stepper label="Fewer Mafia" disabled={mafia <= 1} onClick={() => update({ mafiaCount: mafia - 1 })}>
            −
          </Stepper>
          <span className="w-8 text-center text-3xl font-bold text-ink">{mafia}</span>
          <Stepper label="More Mafia" disabled={mafia >= max} onClick={() => update({ mafiaCount: mafia + 1 })}>
            +
          </Stepper>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-ink">Special roles</h2>
        <Toggle
          label="🩺 Doctor"
          hint="Protects one player each night"
          on={settings.doctor}
          onChange={(doctor) => update({ doctor })}
        />
        <Toggle
          label="🔎 Detective"
          hint="Checks one player each night"
          on={settings.detective}
          onChange={(detective) => update({ detective })}
        />
        <Toggle
          label="🎭 Show roles when out"
          hint="Reveal what someone was when they leave the game"
          on={settings.revealRoles}
          onChange={(revealRoles) => update({ revealRoles })}
        />
      </section>

      <section className="rounded-3xl bg-white p-5 text-left text-lg text-ink shadow-sm">
        <p className="mb-2 font-bold">How to play</p>
        <ol className="flex flex-col gap-1.5">
          <li>🤫 Everyone secretly sees their role</li>
          <li>🌙 At night, pass the phone round. Everyone takes a turn, so nobody can tell who&apos;s who</li>
          <li>☀️ In the day, talk it over and vote someone out</li>
          <li>🏆 The town wins if they catch all the Mafia. The Mafia win if they take over the town!</li>
        </ol>
      </section>

      <div className="mt-auto pt-2">
        <BigButton onClick={onStart} disabled={players.length < MIN_PLAYERS}>
          {startLabel(players.length, MIN_PLAYERS)}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- Secret role card ---------- */

function RoleCardScreen({
  player,
  game,
  byId,
  isLast,
  onDone,
}: {
  player: Player;
  game: Game;
  byId: Map<string, Player>;
  isLast: boolean;
  onDone: () => void;
}) {
  const [seen, setSeen] = useState(false);
  const role = game.roles[player.id];
  const info = ROLES[role];
  const partners = role === "mafia" ? aliveWith(game, "mafia").filter((id) => id !== player.id) : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 text-center">
      <div className="flex items-center gap-3">
        <Avatar player={player} size="sm" />
        <p className="text-2xl font-bold">{player.name}&apos;s role</p>
      </div>

      <HoldCard
        onSeen={() => setSeen(true)}
        backClassName={info.card}
        back={
          <>
            <span className="text-lg font-semibold opacity-70">You are the</span>
            <span className="text-8xl" aria-hidden>
              {info.emoji}
            </span>
            <span className="text-5xl font-bold leading-tight">{info.name}</span>
            <span className="text-base opacity-80">{info.goal}</span>
            {partners.length > 0 && (
              <span className="mt-1 rounded-2xl bg-black/20 px-3 py-2 text-base font-semibold">
                Your team: {partners.map((id) => byId.get(id)!.name).join(", ")}
              </span>
            )}
          </>
        }
      />

      <div className="mt-auto w-full">
        {seen ? (
          <BigButton onClick={onDone}>{isLast ? "Everyone's ready! 🌙" : "Done – pass the phone ➜"}</BigButton>
        ) : (
          <p className="py-5 text-xl text-ink/50">Hold the card, then let go to hide it.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Night ---------- */

function NightIntro({ night, onStart }: { night: number; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center text-white">
      <span className="animate-pop text-9xl" aria-hidden>
        🌙
      </span>
      <p className="text-5xl font-bold">Night {night}</p>
      <p className="text-xl text-white/70">The town falls asleep…</p>
      <div className="w-full rounded-3xl bg-white/10 p-5 text-left text-lg">
        <ol className="flex flex-col gap-1.5">
          <li>📱 The phone goes to everyone, one at a time</li>
          <li>🤫 Do your night job in secret, then pass it on</li>
          <li>🙈 Everyone else: no peeking!</li>
        </ol>
      </div>
      <div className="mt-auto w-full">
        <BigButton onClick={onStart}>Start the night 🌙</BigButton>
      </div>
    </div>
  );
}

function NightPass({ player, caption, onReady }: { player: Player; caption: string; onReady: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center text-white">
      <p className="text-lg font-semibold text-white/50">{caption}</p>
      <p className="text-3xl font-bold">Give the phone to</p>
      <div className="animate-pop">
        <Avatar player={player} size="xl" />
      </div>
      <p className="text-5xl font-bold">{player.name}</p>
      <p className="text-lg text-white/60">Shh… everyone else close your eyes 😴</p>
      <div className="mt-auto w-full">
        <BigButton onClick={onReady}>I&apos;m {player.name} 👋</BigButton>
      </div>
    </div>
  );
}

function NightTurn({
  player,
  game,
  picks,
  byId,
  isLast,
  onDone,
}: {
  player: Player;
  game: Game;
  picks: NightPicks;
  byId: Map<string, Player>;
  isLast: boolean;
  onDone: (target: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const role = game.roles[player.id];
  const living = alive(game);

  const job = {
    mafia: "Who should the Mafia catch tonight?",
    doctor: "Who do you want to protect tonight?",
    detective: "Who do you want to check?",
    villager: "You're fast asleep 😴 Tap who you think is sneaky.",
  }[role];

  function blocked(id: string) {
    if (role === "mafia") return game.roles[id] === "mafia";
    if (role === "doctor") return id === game.lastSaved;
    return id === player.id;
  }

  const passLabel = isLast ? "Done – wake everyone up ☀️" : "Done – pass the phone ➜";

  if (checked && picked) {
    const isMafia = game.roles[picked] === "mafia";
    const target = byId.get(picked)!;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center text-white">
        <Avatar player={target} size="xl" />
        <p className="text-4xl font-bold">{target.name}</p>
        <p className={`animate-pop rounded-3xl px-6 py-4 text-3xl font-bold ${isMafia ? "bg-imposter" : "bg-teal"}`}>
          {isMafia ? "IS in the Mafia 😈" : "is NOT in the Mafia 😇"}
        </p>
        <p className="text-lg text-white/60">Remember this, but don&apos;t say how you know!</p>
        <div className="mt-auto w-full">
          <BigButton onClick={() => onDone(picked)}>{passLabel}</BigButton>
        </div>
      </div>
    );
  }

  const partnerPicks = role === "mafia" ? picks.mafia : [];
  const notes = role === "detective" ? Object.entries(game.checks) : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center text-white">
      <div className="flex items-center gap-3">
        <Avatar player={player} size="sm" />
        <RoleChip game={game} id={player.id} />
      </div>
      <p className="text-3xl font-bold leading-tight">{job}</p>

      {partnerPicks.map((p) => (
        <p key={p.by} className="w-full rounded-2xl bg-imposter/30 px-4 py-2 text-lg">
          🤫 {byId.get(p.by)!.name} picked <b>{byId.get(p.target)!.name}</b>
        </p>
      ))}
      {notes.length > 0 && (
        <div className="w-full rounded-2xl bg-white/10 px-4 py-2 text-left text-base">
          <p className="font-bold">🔎 Your notes</p>
          {notes.map(([id, isMafia]) => (
            <p key={id}>
              {byId.get(id)!.name}: {isMafia ? "Mafia 😈" : "not Mafia 😇"}
            </p>
          ))}
        </div>
      )}
      {role === "doctor" && game.lastSaved && (
        <p className="text-base text-white/60">You can&apos;t protect {byId.get(game.lastSaved)!.name} two nights in a row.</p>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        {living.map((id) => {
          const p = byId.get(id)!;
          const on = picked === id;
          return (
            <button
              key={id}
              onClick={() => setPicked(id)}
              disabled={blocked(id)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-2 rounded-3xl border-4 p-3 text-ink shadow-sm transition-colors active:scale-95 disabled:opacity-30 ${
                on ? "border-sun bg-sun" : "border-transparent bg-white"
              }`}
            >
              <Avatar player={p} size="sm" />
              <span className="w-full truncate text-lg font-bold">
                {p.name}
                {id === player.id && " (you)"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto w-full pt-2">
        <BigButton
          disabled={!picked}
          onClick={() => (role === "detective" ? setChecked(true) : onDone(picked!))}
        >
          {role === "detective" ? "Check them 🔎" : passLabel}
        </BigButton>
      </div>
    </div>
  );
}

/* ---------- Morning ---------- */

function OutCard({ player, game, revealRoles }: { player: Player; game: Game; revealRoles: boolean }) {
  return (
    <div className="animate-pop flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar player={player} size="xl" />
        <span className="absolute -right-2 -top-2 text-6xl" aria-hidden>
          👻
        </span>
      </div>
      <p className="text-4xl font-bold">{player.name}</p>
      {revealRoles ? (
        <p className="flex items-center gap-2 text-xl font-semibold text-ink/70">
          was the <RoleChip game={game} id={player.id} />
        </p>
      ) : (
        <p className="text-xl font-semibold text-ink/60">Their role stays a secret 🤫</p>
      )}
    </div>
  );
}

function MorningScreen({
  caught,
  saved,
  game,
  revealRoles,
  onNext,
}: {
  caught: Player | null;
  saved: boolean;
  game: Game;
  revealRoles: boolean;
  onNext: () => void;
}) {
  const over = winner(game) !== null;
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <span className="text-8xl" aria-hidden>
        ☀️
      </span>
      <p className="text-4xl font-bold">Good morning!</p>
      {caught ? (
        <>
          <p className="text-2xl font-semibold text-imposter">The Mafia caught…</p>
          <OutCard player={caught} game={game} revealRoles={revealRoles} />
          <p className="text-lg text-ink/60">{caught.name} is a ghost now 👻 Ghosts can watch, but no talking!</p>
        </>
      ) : (
        <>
          <p className="animate-pop text-3xl font-bold text-teal">🎉 Everyone woke up safe!</p>
          {saved && <p className="text-xl font-semibold text-ink/70">🩺 The Doctor saved someone last night!</p>}
        </>
      )}
      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{over ? "See who won 🏆" : "Start talking 🗣️"}</BigButton>
      </div>
    </div>
  );
}

/* ---------- Day ---------- */

function DayScreen({ game, byId, onVote }: { game: Game; byId: Map<string, Player>; onVote: () => void }) {
  const living = alive(game);
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <p className="text-4xl font-bold">☀️ Day {game.night}</p>
      <p className="text-xl text-ink/70">Who is acting sneaky? Talk it over!</p>

      <section className="w-full rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-left text-lg font-bold">Still in the game ({living.length})</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {living.map((id) => (
            <div key={id} className="flex w-16 flex-col items-center gap-1">
              <Avatar player={byId.get(id)!} size="sm" />
              <span className="w-full truncate text-sm font-semibold">{byId.get(id)!.name}</span>
            </div>
          ))}
        </div>
        {game.out.length > 0 && (
          <>
            <h2 className="mb-3 mt-4 text-left text-lg font-bold text-ink/50">👻 Ghosts (no talking!)</h2>
            <div className="flex flex-wrap justify-center gap-3 opacity-50 grayscale">
              {game.out.map((id) => (
                <div key={id} className="flex w-16 flex-col items-center gap-1">
                  <Avatar player={byId.get(id)!} size="sm" />
                  <span className="w-full truncate text-sm font-semibold">{byId.get(id)!.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mt-auto w-full">
        <BigButton onClick={onVote}>Time to vote 🗳️</BigButton>
      </div>
    </div>
  );
}

function VoteScreen({
  candidates,
  onVote,
  onBack,
}: {
  candidates: Player[];
  onVote: (id: string | null) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <div>
        <p className="text-3xl font-bold">Who gets voted out?</p>
        <p className="mt-1 text-lg text-ink/60">On 3, everyone points. Tap who got the most votes.</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        {candidates.map((p) => {
          const on = picked === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPicked(p.id)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-2 rounded-3xl border-4 p-4 shadow-sm transition-colors active:scale-95 ${
                on ? "border-imposter bg-imposter/15" : "border-transparent bg-white"
              }`}
            >
              <Avatar player={p} />
              <span className="w-full truncate text-xl font-bold">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto flex w-full flex-col gap-3 pt-2">
        <BigButton disabled={!picked} onClick={() => onVote(picked)}>
          Vote them out 🗳️
        </BigButton>
        <BigButton variant="secondary" onClick={() => onVote(null)}>
          It&apos;s a tie – nobody goes
        </BigButton>
        <button onClick={onBack} className="py-1 text-lg font-semibold text-ink/50">
          ← Keep talking
        </button>
      </div>
    </div>
  );
}

function VoteResultScreen({
  out,
  game,
  revealRoles,
  onNext,
}: {
  out: Player | null;
  game: Game;
  revealRoles: boolean;
  onNext: () => void;
}) {
  const over = winner(game) !== null;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      {out ? (
        <>
          <p className="text-3xl font-bold">The town voted out…</p>
          <OutCard player={out} game={game} revealRoles={revealRoles} />
        </>
      ) : (
        <p className="text-3xl font-bold">Nobody was voted out today 🤷</p>
      )}
      <div className="mt-auto w-full">
        <BigButton onClick={onNext}>{over ? "See who won 🏆" : "Night falls 🌙"}</BigButton>
      </div>
    </div>
  );
}

/* ---------- The end ---------- */

function EndScreen({
  winner,
  game,
  players,
  onPlayAgain,
  onSetup,
}: {
  winner: Team;
  game: Game;
  players: Player[];
  onPlayAgain: () => void;
  onSetup: () => void;
}) {
  const mafiaWon = winner === "mafia";
  return (
    <div className="flex flex-1 flex-col items-center gap-5 text-center">
      <span className="animate-pop pt-4 text-9xl" aria-hidden>
        {mafiaWon ? "😈" : "🎉"}
      </span>
      <p className={`text-4xl font-bold ${mafiaWon ? "text-imposter" : "text-teal"}`}>
        {mafiaWon ? "The Mafia wins!" : "The town wins!"}
      </p>
      <p className="text-lg text-ink/60">
        {mafiaWon ? "They took over the town without getting caught." : "Every member of the Mafia was found!"}
      </p>

      <ul className="flex w-full flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm">
        {players.map((p) => {
          const isOut = game.out.includes(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2">
              <span className={isOut ? "opacity-50 grayscale" : ""}>
                <Avatar player={p} size="sm" />
              </span>
              <span className="flex-1 truncate text-left text-xl font-semibold">
                {p.name} {isOut && "👻"}
              </span>
              <RoleChip game={game} id={p.id} />
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex w-full flex-col gap-3">
        <BigButton onClick={onPlayAgain}>Play again 🔄</BigButton>
        <BigButton variant="secondary" onClick={onSetup}>
          Change players or roles
        </BigButton>
      </div>
    </div>
  );
}
