import { readStored, shuffle, writeStored, type Player } from "./players";
import { DILEMMA_PACKS, type Dilemma } from "./would-you-rather-prompts";

export const MIN_PLAYERS = 2;
export const QUESTION_OPTIONS = [5, 10, 15, 20];

export type Settings = {
  categoryIds: string[];
  questions: number;
};

export type Choice = "a" | "b";

/** One answered question: the dilemma and what each player picked. Players who sat it out are missing. */
export type Answer = { dilemma: Dilemma; votes: Record<string, Choice> };

const STORAGE_KEY = "would-you-rather:v1";

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: ["silly", "food", "powers"],
  questions: 10,
};

export function loadSettings(): Settings {
  const saved = readStored<Partial<Settings>>(STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  const validIds = new Set(DILEMMA_PACKS.map((c) => c.id));
  const categoryIds = (saved.categoryIds ?? []).filter((id) => validIds.has(id));
  return {
    categoryIds: categoryIds.length ? categoryIds : DEFAULT_SETTINGS.categoryIds,
    questions: QUESTION_OPTIONS.includes(saved.questions ?? 0) ? saved.questions! : DEFAULT_SETTINGS.questions,
  };
}

export function saveSettings(settings: Settings) {
  writeStored(STORAGE_KEY, settings);
}

const keyOf = (d: Dilemma) => `${d.a.text}|${d.b.text}`;

/** Picks `count` dilemmas from the chosen packs, using ones not in `recent` first. */
export function dealDilemmas(categoryIds: string[], count: number, recent: string[]): Dilemma[] {
  const pool = DILEMMA_PACKS.filter((c) => categoryIds.includes(c.id)).flatMap((c) => c.items);
  const fresh = pool.filter((d) => !recent.includes(keyOf(d)));
  const stale = pool.filter((d) => recent.includes(keyOf(d)));
  // Swap sides at random so the same option isn't always on the left.
  return [...shuffle(fresh), ...shuffle(stale)]
    .slice(0, count)
    .map((d) => (Math.random() < 0.5 ? d : { a: d.b, b: d.a }));
}

export function dilemmaKeys(dilemmas: Dilemma[]) {
  return dilemmas.map(keyOf);
}

/** The two players who picked the same side most often. */
export function brainTwins(answers: Answer[], players: Player[]) {
  let best: { pair: [Player, Player]; same: number; both: number } | null = null;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const [p, q] = [players[i], players[j]];
      let same = 0;
      let both = 0;
      for (const { votes } of answers) {
        if (!votes[p.id] || !votes[q.id]) continue;
        both++;
        if (votes[p.id] === votes[q.id]) same++;
      }
      if (same > 0 && (!best || same / both > best.same / best.both)) best = { pair: [p, q], same, both };
    }
  }
  return best;
}

/** The player who most often picked the side fewer people chose. */
export function freeSpirit(answers: Answer[], players: Player[]) {
  const counts = new Map(players.map((p) => [p.id, 0]));
  for (const { votes } of answers) {
    const picks = Object.values(votes);
    const a = picks.filter((v) => v === "a").length;
    const b = picks.length - a;
    if (a === b) continue;
    const minority: Choice = a < b ? "a" : "b";
    for (const [id, v] of Object.entries(votes)) if (v === minority) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const [top] = players.map((player) => ({ player, times: counts.get(player.id) ?? 0 })).sort((x, y) => y.times - x.times);
  return top && top.times > 0 ? top : null;
}
