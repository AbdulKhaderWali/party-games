import { randomInt, readStored, shuffle, writeStored } from "./players";
import { CATEGORIES, type Word } from "./words";

export const MIN_PLAYERS = 3;

export type Settings = {
  categoryIds: string[];
  imposterCount: number;
};

export type Round = {
  word: Word;
  categoryId: string;
  imposters: number[];
  starter: number;
};

const STORAGE_KEY = "guess-imposter:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["kids"],
  imposterCount: 1,
};

export function maxImposters(playerCount: number) {
  return Math.max(1, Math.floor(playerCount / 3));
}

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(CATEGORIES.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    imposterCount: saved.imposterCount ?? 1,
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

/** Picks a word, the imposters and who starts. Avoids words in `recent`. */
export function dealRound(settings: Settings, playerCount: number, recent: string[]): Round {
  const pool = CATEGORIES.filter((c) => settings.categoryIds.includes(c.id)).flatMap((c) =>
    c.words.map((word) => ({ word, categoryId: c.id })),
  );
  const fresh = pool.filter((p) => !recent.includes(p.word.text));
  const candidates = fresh.length ? fresh : pool;
  const pick = candidates[randomInt(candidates.length)];

  const count = Math.min(settings.imposterCount, maxImposters(playerCount));
  const order = shuffle(Array.from({ length: playerCount }, (_, i) => i));

  return {
    word: pick.word,
    categoryId: pick.categoryId,
    imposters: order.slice(0, count).sort((a, b) => a - b),
    starter: randomInt(playerCount),
  };
}
