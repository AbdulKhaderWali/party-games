import type { Metadata } from "next";
import { EmojiRiddlesLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Emoji Riddles",
};

export default function EmojiRiddlesPage() {
  return <EmojiRiddlesLoader />;
}
