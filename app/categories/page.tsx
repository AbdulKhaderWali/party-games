import type { Metadata } from "next";
import { CategoriesLoader } from "../components/GameLoader";

export const metadata: Metadata = {
  title: "Categories A–Z",
};

export default function CategoriesPage() {
  return <CategoriesLoader />;
}
