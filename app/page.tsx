import { HeroSection } from "./_components/hero-section";
import { FeaturesGrid } from "./_components/features-grid";
import { CorpusPreview } from "./_components/corpus-preview";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <HeroSection />
      <FeaturesGrid />
      <CorpusPreview />
    </div>
  );
}
