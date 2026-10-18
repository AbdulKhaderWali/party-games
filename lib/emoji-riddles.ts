import { readStored, shuffle, writeStored } from "./players";
import { RIDDLE_PACKS } from "./emoji-riddles-prompts";
import type { Word } from "./words";

export const MIN_PLAYERS = 2;
export const QUESTION_OPTIONS = [5, 10, 15, 20];
/** Points for a correct answer after 0, 1 or 2 hints. */
export const POINTS = [3, 2, 1];

export type Settings = {
  categoryIds: string[];
  questions: number;
};

export type Riddle = Word & { categoryId: string };

const STORAGE_KEY = "emoji-riddles:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["words", "stories", "movies"],
  questions: 10,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(RIDDLE_PACKS.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    questions: QUESTION_OPTIONS.includes(saved.questions ?? 0) ? saved.questions! : DEFAULT_SETTINGS.questions,
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

/** Picks `count` riddles from the chosen packs, using ones not in `recent` first. */
export function dealRiddles(categoryIds: string[], count: number, recent: string[]): Riddle[] {
  const pool = RIDDLE_PACKS.filter((c) => categoryIds.includes(c.id)).flatMap((c) =>
    c.words.map((w) => ({ ...w, categoryId: c.id })),
  );
  const fresh = pool.filter((r) => !recent.includes(r.text));
  const stale = pool.filter((r) => recent.includes(r.text));
  return [...shuffle(fresh), ...shuffle(stale)].slice(0, count);
}

/**
 * Each word of the answer with its letters hidden, e.g. ["_ _ _", "_ _ _ _"].
 * With two or more hints the first letter of each word shows.
 */
export function hintFor(answer: string, hints: number) {
  return answer
    .split(" ")
    .map((word) =>
      [...word].map((ch, i) => (!/[a-z]/i.test(ch) ? ch : i === 0 && hints >= 2 ? ch.toUpperCase() : "_")).join(" "),
    );
}
