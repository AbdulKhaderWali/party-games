export const MAX_PLAYERS = 20;

export const AVATARS = [
  { emoji: "🐶", color: "#FFB547" },
  { emoji: "🐱", color: "#FF7A93" },
  { emoji: "🐸", color: "#6BD66B" },
  { emoji: "🦊", color: "#FF8A4C" },
  { emoji: "🐼", color: "#9AA7B8" },
  { emoji: "🐵", color: "#C69060" },
  { emoji: "🐰", color: "#E39CFF" },
  { emoji: "🐯", color: "#FFC83D" },
  { emoji: "🐨", color: "#8FB8FF" },
  { emoji: "🦁", color: "#F2A93B" },
  { emoji: "🐷", color: "#FF9EC4" },
  { emoji: "🐙", color: "#B58CFF" },
  { emoji: "🦄", color: "#FF8FD8" },
  { emoji: "🐳", color: "#4CC3FF" },
  { emoji: "🐢", color: "#4FCB9A" },
  { emoji: "🐧", color: "#7FA2C9" },
];

export type Player = { id: string; name: string; avatar: number };

/** Players are shared by every game. */
const PLAYERS_KEY = "party-games:players";
/** Where players lived before there was more than one game. */
const LEGACY_KEY = "guess-imposter:v1";

export function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); the game still works.
  }
}

export function loadPlayers(): Player[] {
  const players = readStored<Player[]>(PLAYERS_KEY) ?? readStored<{ players?: Player[] }>(LEGACY_KEY)?.players;
  return Array.isArray(players) ? players : [];
}

export function savePlayers(players: Player[]) {
  writeStored(PLAYERS_KEY, players);
}

export function nextFreeAvatar(players: Player[]) {
  const used = new Set(players.map((p) => p.avatar));
  const free = AVATARS.findIndex((_, i) => !used.has(i));
  return free === -1 ? players.length % AVATARS.length : free;
}

export function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
