import { z } from "zod";

export const Flashcard = z.object({
  question: z.string(),
  answer: z.string(),
});

export const FlashcardsResponse = z.object({
  flashcards: z.array(Flashcard),
}); 