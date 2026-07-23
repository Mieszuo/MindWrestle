export function splitSpeechSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.match(/[^.!?…]+[.!?…]?/g);
  if (!parts?.length) return [trimmed];

  return parts.map((part) => part.trim()).filter(Boolean);
}
