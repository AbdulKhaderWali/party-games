import type { Metadata } from "next";
import { ImposterLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Guess the Imposter",
};

export default function ImposterPage() {
  return <ImposterLoader />;
}
