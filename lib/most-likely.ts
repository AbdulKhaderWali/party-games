import { readStored, shuffle, writeStored, type Player } from "./players";
import { PROMPT_PACKS } from "./most-likely-prompts";
import type { Word } from "./words";

export const MIN_PLAYERS = 3;
export const QUESTION_OPTIONS = [5, 10, 15, 20];

export type Settings = {
  categoryIds: string[];
  questions: number;
};

/** One answered question: the prompt and whoever got the most fingers pointed at them. */
export type Answer = { prompt: Word; winners: string[] };

const STORAGE_KEY = "most-likely:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["silly", "food", "everyday"],
  questions: 10,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(PROMPT_PACKS.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    questions: QUESTION_OPTIONS.includes(saved.questions ?? 0) ? saved.questions! : DEFAULT_SETTINGS.questions,
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

/** Picks `count` prompts from the chosen packs, using ones not in `recent` first. */
export function dealPrompts(categoryIds: string[], count: number, recent: string[]): Word[] {
  const pool = PROMPT_PACKS.filter((c) => categoryIds.includes(c.id)).flatMap((c) => c.words);
  const fresh = pool.filter((w) => !recent.includes(w.text));
  const stale = pool.filter((w) => recent.includes(w.text));
  return [...shuffle(fresh), ...shuffle(stale)].slice(0, count);
}

/** How many times each player was picked, most first. */
export function tally(answers: Answer[], players: Player[]) {
  const counts = new Map(players.map((p) => [p.id, 0]));
  for (const a of answers) for (const id of a.winners) counts.set(id, (counts.get(id) ?? 0) + 1);
  return players
    .map((player) => ({ player, score: counts.get(player.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
