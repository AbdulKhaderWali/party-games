import type { Metadata } from "next";
import { TruthOrDareLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Truth or Dare",
};

export default function TruthOrDarePage() {
  return <TruthOrDareLoader />;
}
