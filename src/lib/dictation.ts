import type { Story } from "./types";

export type DictationBlank = { start: number; end: number; answer: string };

const COMMON_WORDS = new Set([
  "about", "after", "again", "always", "because", "before", "could", "every", "first", "from", "have", "into", "just", "little", "many", "more", "much", "never", "only", "other", "over", "said", "some", "than", "that", "their", "them", "there", "these", "they", "this", "those", "through", "very", "want", "were", "what", "when", "where", "which", "while", "with", "would", "your", "herself", "himself", "something", "nothing",
]);

const PREFERRED_WORDS = new Set([
  "animal", "apple", "baby", "beach", "bike", "bird", "book", "cake", "car", "child", "children", "colour", "door", "family", "farm", "father", "flower", "food", "friend", "garden", "girl", "green", "happy", "horse", "house", "learn", "looked", "mother", "park", "people", "picture", "play", "read", "river", "school", "shoes", "shop", "small", "story", "street", "teacher", "tree", "water", "window", "work",
]);

type Word = DictationBlank & { index: number; key: string };

export function createDictation(story: Pick<Story, "content" | "activities">): DictationBlank[] {
  const words: Word[] = [...story.content.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)].map((match, index) => ({
    start: match.index,
    end: match.index + match[0].length,
    answer: match[0],
    index,
    key: match[0].toLowerCase().replace(/[’]/g, "'"),
  }));
  if (!words.length) return [];

  // Five blanks for a short Movers story, six for a longer one.
  const target = Math.min(words.length, words.length >= 85 ? 6 : 5);
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word.key, (counts.get(word.key) || 0) + 1);

  const vocabulary = (story.activities?.vocabulary || []).flatMap(item =>
    [...item.term.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)].map(match => match[0].toLowerCase().replace(/[’]/g, "'")),
  );
  const curated = new Map(vocabulary.map((word, index) => [word, index]));
  const candidates = words.filter(word => word.key.length >= 4 && word.key.length <= 12 && !COMMON_WORDS.has(word.key) && !word.key.includes("'"));
  const ranked = [...candidates].sort((a, b) => {
    const aCurated = curated.has(a.key) ? 1 : 0;
    const bCurated = curated.has(b.key) ? 1 : 0;
    if (aCurated !== bCurated) return bCurated - aCurated;
    const aUnique = counts.get(a.key) === 1 ? 1 : 0;
    const bUnique = counts.get(b.key) === 1 ? 1 : 0;
    if (aUnique !== bUnique) return bUnique - aUnique;
    if (aCurated) return (curated.get(a.key) || 0) - (curated.get(b.key) || 0) || a.index - b.index;
    const aPreferred = PREFERRED_WORDS.has(a.key) ? 1 : 0;
    const bPreferred = PREFERRED_WORDS.has(b.key) ? 1 : 0;
    return bPreferred - aPreferred || a.index - b.index;
  });

  const selected: Word[] = [];
  const used = new Set<string>();
  // Exhaust words from the source vocabulary before choosing words from the story.
  for (const pool of [ranked.filter(word => curated.has(word.key)), ranked.filter(word => !curated.has(word.key))]) {
    for (const minimumGap of [5, 2, 0]) {
      for (const word of pool) {
        if (selected.length >= target) break;
        if (used.has(word.key) || selected.some(existing => Math.abs(existing.index - word.index) <= minimumGap)) continue;
        selected.push(word);
        used.add(word.key);
      }
    }
  }
  return selected.sort((a, b) => a.start - b.start).map(({ start, end, answer }) => ({ start, end, answer }));
}

export function isCorrectDictationAnswer(input: string, answer: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, "");
  return normalize(input) === normalize(answer);
}
