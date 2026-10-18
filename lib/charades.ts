import { randomInt, readStored, shuffle, writeStored, type Player } from "./players";
import { CHARADES_CATEGORIES } from "./charades-words";
import type { Word } from "./words";

export const MIN_PLAYERS = 2;
export const TIMER_OPTIONS = [30, 60, 90, 120];
export const MAX_ROUNDS = 5;

export type Settings = {
  categoryIds: string[];
  seconds: number;
  rounds: number;
};

export type Deal = { word: Word; categoryId: string };

export type Match = {
  /** Player ids in acting order. */
  order: string[];
  /** Turn index across the whole game; the actor is `order[turn % order.length]`. */
  turn: number;
  scores: Record<string, number>;
  deal: Deal;
  used: string[];
};

const STORAGE_KEY = "charades:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["easy", "animals", "actions"],
  seconds: 60,
  rounds: 2,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(CHARADES_CATEGORIES.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    seconds: TIMER_OPTIONS.includes(saved.seconds ?? 0) ? saved.seconds! : DEFAULT_SETTINGS.seconds,
    rounds: Math.min(MAX_ROUNDS, Math.max(1, saved.rounds ?? DEFAULT_SETTINGS.rounds)),
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

/** Picks a word from the chosen categories, avoiding words in `avoid` while any are left. */
export function dealWord(categoryIds: string[], avoid: string[]): Deal {
  const pool = CHARADES_CATEGORIES.filter((c) => categoryIds.includes(c.id)).flatMap((c) =>
    c.words.map((word) => ({ word, categoryId: c.id })),
  );
  const fresh = pool.filter((p) => !avoid.includes(p.word.text));
  const candidates = fresh.length ? fresh : pool;
  return candidates[randomInt(candidates.length)];
}

export function newMatch(players: Player[], settings: Settings, recent: string[]): Match {
  const deal = dealWord(settings.categoryIds, recent);
  return {
    order: shuffle(players.map((p) => p.id)),
    turn: 0,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    deal,
    used: [deal.word.text],
  };
}

export function nextTurn(match: Match, settings: Settings, recent: string[]): Match {
  const deal = dealWord(settings.categoryIds, [...match.used, ...recent]);
  return { ...match, turn: match.turn + 1, deal, used: [...match.used, deal.word.text] };
}

/** Gives a point to the guesser and to the actor. */
export function award(match: Match, actorId: string, guesserId: string): Match {
  const scores = { ...match.scores };
  scores[actorId] = (scores[actorId] ?? 0) + 1;
  scores[guesserId] = (scores[guesserId] ?? 0) + 1;
  return { ...match, scores };
}
