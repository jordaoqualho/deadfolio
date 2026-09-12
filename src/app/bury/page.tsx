import { pageMetadata } from "@/lib/i18n/metadata";
import { StoryInput } from "@/components/submission/story-input";
import { aiConfigured } from "@/lib/ai/extract-project";
export async function generateMetadata() {
  return pageMetadata("/bury", "Bury a Project", "Tell us what happened.");
}
export const dynamic = "force-dynamic";
export default function Bury() {
  return (
    <div className="shell page-space">
      <StoryInput aiEnabled={aiConfigured()} />
    </div>
  );
}
