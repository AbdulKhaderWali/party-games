import { randomInt, readStored, writeStored } from "./players";
import type { Word } from "./words";

export const MIN_PLAYERS = 2;
export const TIMER_OPTIONS = [20, 30, 45, 60];
export const MAX_ROUNDS = 5;

/** Letters lots of kid words start with. */
const EASY_LETTERS = [..."ABCDFGHLMPRST"];
/** Everything except letters almost nothing starts with. */
const ALL_LETTERS = [..."ABCDEFGHIJKLMNOPRSTUVWY"];

export type LetterSet = "easy" | "all";

export type Settings = {
  seconds: number;
  rounds: number;
  letters: LetterSet;
};

/** Each topic reads as "<topic> starting with <letter>". */
export const TOPICS: Word[] = [
  { text: "An animal", emoji: "🐾" },
  { text: "A food", emoji: "🍔" },
  { text: "A fruit or vegetable", emoji: "🍎" },
  { text: "A name", emoji: "📛" },
  { text: "Something in your house", emoji: "🏠" },
  { text: "A toy or game", emoji: "🧸" },
  { text: "Something you wear", emoji: "👕" },
  { text: "Something at the beach", emoji: "🏖️" },
  { text: "Something at school", emoji: "🏫" },
  { text: "A job", emoji: "👩‍🚒" },
  { text: "A place or country", emoji: "🗺️" },
  { text: "Something in the kitchen", emoji: "🍳" },
  { text: "A cartoon or movie character", emoji: "🦸" },
  { text: "Something that moves", emoji: "🚗" },
  { text: "Something in the garden", emoji: "🌻" },
  { text: "Something you find at a party", emoji: "🎈" },
  { text: "A sweet treat", emoji: "🍭" },
  { text: "Something in a supermarket", emoji: "🛒" },
  { text: "A word that describes you", emoji: "😎" },
  { text: "Something in the sky", emoji: "☁️" },
];

export type Turn = { topic: Word; letter: string };

const STORAGE_KEY = "categories-az:v1";

export const DEFAULT_SETTINGS: Settings = {
  seconds: 30,
  rounds: 2,
  letters: "easy",
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  return {
    seconds: TIMER_OPTIONS.includes(saved.seconds ?? 0) ? saved.seconds! : DEFAULT_SETTINGS.seconds,
    rounds: Math.min(MAX_ROUNDS, Math.max(1, saved.rounds ?? DEFAULT_SETTINGS.rounds)),
    letters: saved.letters === "all" ? "all" : "easy",
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

export function lettersFor(set: LetterSet) {
  return set === "all" ? ALL_LETTERS : EASY_LETTERS;
}

function pickFresh<T>(items: T[], avoid: T[]) {
  const fresh = items.filter((x) => !avoid.includes(x));
  const pool = fresh.length ? fresh : items;
  return pool[randomInt(pool.length)];
}

/** A topic and letter, avoiding recent ones while others are left. */
export function dealTurn(set: LetterSet, recent: Turn[]): Turn {
  return {
    topic: pickFresh(
      TOPICS,
      recent.map((t) => t.topic),
    ),
    letter: pickFresh(
      lettersFor(set),
      recent.map((t) => t.letter),
    ),
  };
}
