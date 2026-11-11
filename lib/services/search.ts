/**
 * Service layer — class diagram: User.askQuestion() / SearchQuery.
 *
 * Thin, explicitly named entry point for the Ask sequence. The RAG pipeline
 * itself stays in `lib/ai/pipeline.ts`.
 */
import {
  answerQuestion,
  type AskPipelineOptions,
  type AskPipelineOutput,
} from "@/lib/ai/pipeline";

export type AskQuestionOptions = AskPipelineOptions;

/** User.askQuestion(question: string, bookId: string): SearchQuery */
export async function askQuestion(
  question: string,
  options: AskQuestionOptions = {},
): Promise<AskPipelineOutput> {
  return answerQuestion(question, options);
}
