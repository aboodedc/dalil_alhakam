import { AskClient } from "./_components/ask-client";
import { AskBackground } from "./_components/ask-background";

export const metadata = { title: "Ask — Dalil Al-Ahkam" };

export default function AskPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <AskBackground />
      <div className="relative flex flex-1 flex-col">
        <AskClient />
      </div>
    </div>
  );
}
