import { randomInt, readStored, shuffle, writeStored, type Player } from "./players";
import { TOD_PACKS } from "./truth-or-dare-prompts";
import type { Word } from "./words";

export const MIN_PLAYERS = 2;
export const MAX_ROUNDS = 5;

export type Kind = "truth" | "dare";

export type Settings = {
  categoryIds: string[];
  rounds: number;
};

export type Match = {
  /** Player ids in turn order. */
  order: string[];
  /** Turn index across the whole game; the player is `order[turn % order.length]`. */
  turn: number;
  stars: Record<string, number>;
  used: string[];
};

const STORAGE_KEY = "truth-or-dare:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["silly", "move", "kind"],
  rounds: 2,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(TOD_PACKS.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    rounds: Math.min(MAX_ROUNDS, Math.max(1, saved.rounds ?? DEFAULT_SETTINGS.rounds)),
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

export function newMatch(players: Player[]): Match {
  return {
    order: shuffle(players.map((p) => p.id)),
    turn: 0,
    stars: Object.fromEntries(players.map((p) => [p.id, 0])),
    used: [],
  };
}

/** Picks a truth or dare from the chosen packs, avoiding cards in `avoid` while any are left. */
export function dealCard(categoryIds: string[], kind: Kind, avoid: string[]): Word {
  const pool = TOD_PACKS.filter((c) => categoryIds.includes(c.id)).flatMap((c) =>
    kind === "truth" ? c.truths : c.dares,
  );
  const fresh = pool.filter((w) => !avoid.includes(w.text));
  const candidates = fresh.length ? fresh : pool;
  return candidates[randomInt(candidates.length)];
}

/** Players with the most stars first. */
export function ranked(match: Match, byId: Map<string, Player>) {
  return match.order
    .map((id) => ({ player: byId.get(id)!, score: match.stars[id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
