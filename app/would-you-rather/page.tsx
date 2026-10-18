import type { Metadata } from "next";
import { WouldYouRatherLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Would You Rather",
};

export default function WouldYouRatherPage() {
  return <WouldYouRatherLoader />;
}
