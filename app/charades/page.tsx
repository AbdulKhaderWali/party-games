import type { Metadata } from "next";
import { CharadesLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Charades",
};

export default function CharadesPage() {
  return <CharadesLoader />;
}
