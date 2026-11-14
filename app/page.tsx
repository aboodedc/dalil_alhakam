import { HeroSection } from "./_components/hero-section";
import { HowItWorks } from "./_components/how-it-works";
import { CorpusPreview } from "./_components/corpus-preview";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <HeroSection />
      <HowItWorks />
      <CorpusPreview />
    </div>
  );
}
