import Link from "next/link";

const GAMES = [
  {
    href: "/imposter",
    emoji: "🕵️",
    name: "Guess the Imposter",
    tagline: "Everyone gets the secret word except the imposter. Can you find the faker?",
    color: "bg-purple",
  },
  {
    href: "/charades",
    emoji: "🎭",
    name: "Charades",
    tagline: "Act out the word before time runs out. No talking!",
    color: "bg-teal",
  },
  {
    href: "/most-likely",
    emoji: "👉",
    name: "Who's Most Likely To…",
    tagline: "Read the question, count to 3, and everyone points!",
    color: "bg-coral",
  },
  {
    href: "/mafia",
    emoji: "😈",
    name: "Mafia",
    tagline: "Mafia, Doctor, Detective and the town. Find the Mafia before they take over!",
    color: "bg-ink",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pb-6 pt-8">
      <header className="text-center">
        <div className="text-6xl" aria-hidden>
          🎉
        </div>
        <h1 className="mt-2 text-4xl font-bold text-ink">Party Games</h1>
        <p className="mt-1 text-lg text-ink/60">One phone. Lots of fun. Pick a game!</p>
      </header>

      <nav className="flex flex-col gap-4">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`flex items-center gap-4 rounded-3xl p-5 text-white shadow-[0_6px_0_rgb(43_33_64/0.2)] transition-transform active:translate-y-1.5 active:shadow-none ${g.color}`}
          >
            <span className="text-6xl" aria-hidden>
              {g.emoji}
            </span>
            <span className="flex-1">
              <span className="block text-2xl font-bold">{g.name}</span>
              <span className="mt-1 block text-base opacity-90">{g.tagline}</span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
