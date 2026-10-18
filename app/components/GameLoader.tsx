"use client";

import dynamic from "next/dynamic";

// The games read saved players from localStorage, so render them only in the browser.
function Loading({ emoji }: { emoji: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-7xl" aria-label="Loading">
      {emoji}
    </div>
  );
}

const ImposterGame = dynamic(() => import("./ImposterGame"), {
  ssr: false,
  loading: () => <Loading emoji="🕵️" />,
});

const CharadesGame = dynamic(() => import("./CharadesGame"), {
  ssr: false,
  loading: () => <Loading emoji="🎭" />,
});

const MostLikelyGame = dynamic(() => import("./MostLikelyGame"), {
  ssr: false,
  loading: () => <Loading emoji="👉" />,
});

const MafiaGame = dynamic(() => import("./MafiaGame"), {
  ssr: false,
  loading: () => <Loading emoji="😈" />,
});

const HotPotatoGame = dynamic(() => import("./HotPotatoGame"), {
  ssr: false,
  loading: () => <Loading emoji="🥔" />,
});

const WouldYouRatherGame = dynamic(() => import("./WouldYouRatherGame"), {
  ssr: false,
  loading: () => <Loading emoji="🤔" />,
});

const TruthOrDareGame = dynamic(() => import("./TruthOrDareGame"), {
  ssr: false,
  loading: () => <Loading emoji="🎲" />,
});

export function ImposterLoader() {
  return <ImposterGame />;
}

export function CharadesLoader() {
  return <CharadesGame />;
}

export function MostLikelyLoader() {
  return <MostLikelyGame />;
}

export function MafiaLoader() {
  return <MafiaGame />;
}

export function HotPotatoLoader() {
  return <HotPotatoGame />;
}

export function WouldYouRatherLoader() {
  return <WouldYouRatherGame />;
}

export function TruthOrDareLoader() {
  return <TruthOrDareGame />;
}
