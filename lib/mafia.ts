import { readStored, shuffle, writeStored, type Player } from "./players";

export const MIN_PLAYERS = 4;

export type Role = "mafia" | "doctor" | "detective" | "villager";
export type Team = "mafia" | "town";

export const ROLES: Record<Role, { name: string; emoji: string; goal: string; card: string }> = {
  mafia: {
    name: "Mafia",
    emoji: "😈",
    goal: "Each night, secretly pick someone to catch. Don't get found out!",
    card: "bg-imposter text-white",
  },
  doctor: {
    name: "Doctor",
    emoji: "🩺",
    goal: "Each night, pick someone to protect from the Mafia. It can be you!",
    card: "bg-teal text-white",
  },
  detective: {
    name: "Detective",
    emoji: "🔎",
    goal: "Each night, check one player to find out if they're in the Mafia.",
    card: "bg-purple text-white",
  },
  villager: {
    name: "Villager",
    emoji: "🧑‍🌾",
    goal: "Work with the town to find the Mafia and vote them out!",
    card: "bg-white text-ink",
  },
};

export type Settings = {
  mafiaCount: number;
  doctor: boolean;
  detective: boolean;
  /** Show a player's role when they're out. */
  revealRoles: boolean;
};

export type Game = {
  /** Every player's id in seating order. */
  seats: string[];
  roles: Record<string, Role>;
  /** Players who are out, in the order they went out. */
  out: string[];
  night: number;
  /** Who the Doctor protected last night; they can't be protected twice in a row. */
  lastSaved: string | null;
  /** What the Detective has found out: player id → is Mafia. */
  checks: Record<string, boolean>;
};

/** What happened during one night, built up as the phone goes round. */
export type NightPicks = {
  mafia: { by: string; target: string }[];
  save: string | null;
};

const STORAGE_KEY = "mafia:v1";

export const DEFAULT_SETTINGS: Settings = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
  revealRoles: true,
};

export function maxMafia(playerCount: number) {
  return Math.max(1, Math.floor((playerCount - 1) / 3));
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readStored<Partial<Settings>>(STORAGE_KEY) };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

export function teamOf(role: Role): Team {
  return role === "mafia" ? "mafia" : "town";
}

export function newGame(players: Player[], settings: Settings): Game {
  const seats = players.map((p) => p.id);
  const mafia = Math.min(settings.mafiaCount, maxMafia(seats.length));
  const deck: Role[] = [
    ...Array<Role>(mafia).fill("mafia"),
    ...(settings.doctor ? (["doctor"] as const) : []),
    ...(settings.detective ? (["detective"] as const) : []),
  ];
  const shuffled = shuffle(seats);
  const roles = Object.fromEntries(shuffled.map((id, i) => [id, deck[i] ?? "villager"]));
  return { seats, roles, out: [], night: 1, lastSaved: null, checks: {} };
}

export function alive(game: Game) {
  return game.seats.filter((id) => !game.out.includes(id));
}

export function aliveWith(game: Game, role: Role) {
  return alive(game).filter((id) => game.roles[id] === role);
}

/** The most-picked target; on a tie, the most recent pick among the tied wins. */
export function mafiaTarget(picks: NightPicks["mafia"]): string | null {
  const counts = new Map<string, number>();
  for (const p of picks) counts.set(p.target, (counts.get(p.target) ?? 0) + 1);
  const top = Math.max(0, ...counts.values());
  for (let i = picks.length - 1; i >= 0; i--) {
    if (counts.get(picks[i].target) === top) return picks[i].target;
  }
  return null;
}

/** Applies the night's picks. `caught` is who went out, `saved` is true if the Doctor stopped the Mafia. */
export function resolveNight(game: Game, picks: NightPicks) {
  const target = mafiaTarget(picks.mafia);
  const saved = target !== null && picks.save === target;
  const caught = saved ? null : target;
  return {
    game: { ...game, out: caught ? [...game.out, caught] : game.out, lastSaved: picks.save },
    caught,
    saved,
  };
}

export function voteOut(game: Game, id: string): Game {
  return { ...game, out: [...game.out, id] };
}

export function nextNight(game: Game): Game {
  return { ...game, night: game.night + 1 };
}

/** The town wins when every Mafia member is out; the Mafia wins once they're at least half of who's left. */
export function winner(game: Game): Team | null {
  const living = alive(game);
  const mafia = living.filter((id) => game.roles[id] === "mafia").length;
  if (mafia === 0) return "town";
  if (mafia >= living.length - mafia) return "mafia";
  return null;
}
