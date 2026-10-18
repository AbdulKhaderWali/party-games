import type { Metadata } from "next";
import { MafiaLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Mafia",
};

export default function MafiaPage() {
  return <MafiaLoader />;
}
