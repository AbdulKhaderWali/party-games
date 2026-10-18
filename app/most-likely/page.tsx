import type { Metadata } from "next";
import { MostLikelyLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Who's Most Likely To",
};

export default function MostLikelyPage() {
  return <MostLikelyLoader />;
}
