import type { Metadata } from "next";
import { DrawItLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Draw It!",
};

export default function DrawItPage() {
  return <DrawItLoader />;
}
