import { readStored, shuffle, writeStored, type Player } from "./players";
import { POTATO_PACKS } from "./hot-potato-prompts";
import type { Word } from "./words";

export const MIN_PLAYERS = 2;
export const ROUND_OPTIONS = [3, 5, 8, 10];
/** The fuse burns for a random time in this range, so nobody knows when it will pop. */
const FUSE_MIN_SECONDS = 12;
const FUSE_MAX_SECONDS = 30;

export type Settings = {
  categoryIds: string[];
  rounds: number;
};

const STORAGE_KEY = "hot-potato:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["easy", "food"],
  rounds: 5,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(POTATO_PACKS.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    rounds: ROUND_OPTIONS.includes(saved.rounds ?? 0) ? saved.rounds! : DEFAULT_SETTINGS.rounds,
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

/** Picks `count` prompts from the chosen packs, using ones not in `recent` first. */
export function dealPrompts(categoryIds: string[], count: number, recent: string[]): Word[] {
  const pool = POTATO_PACKS.filter((c) => categoryIds.includes(c.id)).flatMap((c) => c.words);
  const fresh = pool.filter((w) => !recent.includes(w.text));
  const stale = pool.filter((w) => recent.includes(w.text));
  return [...shuffle(fresh), ...shuffle(stale)].slice(0, count);
}

export function fuseMs() {
  return (FUSE_MIN_SECONDS + Math.random() * (FUSE_MAX_SECONDS - FUSE_MIN_SECONDS)) * 1000;
}

/** Players with the fewest potatoes first. */
export function ranked(potatoes: Record<string, number>, players: Player[]) {
  return players
    .map((player) => ({ player, score: potatoes[player.id] ?? 0 }))
    .sort((a, b) => a.score - b.score);
}
