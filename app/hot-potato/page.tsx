import type { Metadata } from "next";
import { HotPotatoLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Hot Potato",
};

export default function HotPotatoPage() {
  return <HotPotatoLoader />;
}
