import type { Metadata } from "next";
import { StoryInput } from "@/components/submission/story-input";
import { aiConfigured } from "@/lib/ai/extract-project";
export const metadata: Metadata = {
  title: "Bury a Project",
  description:
    "Tell us what you built, why it stopped, and what survived. No account required.",
  alternates: { canonical: "/bury" },
};
export const dynamic = "force-dynamic";
export default function Bury() {
  return (
    <div className="shell page-space">
      <StoryInput aiEnabled={aiConfigured()} />
    </div>
  );
}
