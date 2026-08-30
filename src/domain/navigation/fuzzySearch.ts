export interface FuzzySearchMatch {
  score: number;
  matchedIndices: number[];
}

const TEXT_SEPARATORS = new Set([' ', '_', '-', '/', '.', '(', ')']);

const SCORE = {
  BASE_CHAR: 1,
  START_OF_TEXT: 20,
  WORD_BOUNDARY: 10,
  CONSECUTIVE_STEP: 8,
  GAP_PENALTY: 3,
  EARLY_POSITION_CAP: 8,
  CONTIGUOUS_BONUS: 50,
  SPAN_PENALTY: 0.5,
} as const;

function isQuerySkippable(char: string): boolean {
  return /\s/.test(char);
}

function isTextSkippable(char: string): boolean {
  return TEXT_SEPARATORS.has(char);
}

function charsEqual(left: string, right: string): boolean {
  return left.toLocaleLowerCase() === right.toLocaleLowerCase();
}

function isWordStart(textChars: readonly string[], index: number): boolean {
  if (index === 0) {
    return true;
  }

  return isTextSkippable(textChars[index - 1] ?? '');
}

function toSearchableCharacters(text: string): string[] {
  return [...text];
}

function compactComparableCharacters(
  chars: readonly string[],
  skip: (char: string) => boolean,
): string {
  let compact = '';

  for (const char of chars) {
    if (skip(char)) {
      continue;
    }

    compact += char.toLocaleLowerCase();
  }

  return compact;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim();
}

export interface PrecomputedSearchQuery {
  trimmedQuery: string;
  queryChars: string[];
  compactQuery: string;
}

export function precomputeSearchQuery(query: string): PrecomputedSearchQuery {
  const trimmedQuery = normalizeSearchQuery(query);
  const queryChars = toSearchableCharacters(trimmedQuery);
  const compactQuery = compactComparableCharacters(queryChars, isQuerySkippable);
  return { trimmedQuery, queryChars, compactQuery };
}

function hasContiguousCompactMatch(textChars: string[], compactQuery: string): boolean {
  if (!compactQuery) {
    return false;
  }

  const compactText = compactComparableCharacters(textChars, isTextSkippable);
  return compactText.includes(compactQuery);
}

function scoreCharacterMatch(args: {
  textIndex: number;
  lastMatchTextIndex: number;
  consecutiveMatches: number;
  atWordStart: boolean;
}): { charScore: number; consecutiveMatches: number; gapPenalty: number } {
  let charScore = SCORE.BASE_CHAR;
  let consecutiveMatches = args.consecutiveMatches;
  let gapPenalty = 0;

  if (args.textIndex === 0) {
    charScore += SCORE.START_OF_TEXT;
  }

  if (args.atWordStart) {
    charScore += SCORE.WORD_BOUNDARY;
  }

  if (args.lastMatchTextIndex === args.textIndex - 1) {
    consecutiveMatches += 1;
    charScore += consecutiveMatches * SCORE.CONSECUTIVE_STEP;
  } else if (args.lastMatchTextIndex >= 0) {
    consecutiveMatches = 0;
    gapPenalty = (args.textIndex - args.lastMatchTextIndex - 1) * SCORE.GAP_PENALTY;
  } else {
    consecutiveMatches = 0;
  }

  charScore += Math.max(0, SCORE.EARLY_POSITION_CAP - args.textIndex);

  return { charScore, consecutiveMatches, gapPenalty };
}

/**
 * Subsequence fuzzy match with scoring. Returns null when query letters cannot
 * be matched in order (whitespace and common separators are skipped in sheet names).
 *
 * Indices in `matchedIndices` align with `[...text]` so highlighting stays stable
 * for unicode sheet names.
 */
export function fuzzySearchMatch(
  text: string,
  query: string,
  precomputed?: PrecomputedSearchQuery,
): FuzzySearchMatch | null {
  const trimmedQuery = precomputed ? precomputed.trimmedQuery : normalizeSearchQuery(query);

  if (!trimmedQuery) {
    return null;
  }

  const textChars = toSearchableCharacters(text);
  const queryChars = precomputed ? precomputed.queryChars : toSearchableCharacters(trimmedQuery);
  let score = 0;
  const matchedIndices: number[] = [];
  let textIndex = 0;
  let queryIndex = 0;
  let lastMatchTextIndex = -1;
  let consecutiveMatches = 0;

  while (textIndex < textChars.length && queryIndex < queryChars.length) {
    const queryChar = queryChars[queryIndex] ?? '';

    if (isQuerySkippable(queryChar)) {
      queryIndex += 1;
      continue;
    }

    const textChar = textChars[textIndex] ?? '';

    if (isTextSkippable(textChar)) {
      textIndex += 1;
      continue;
    }

    if (charsEqual(textChar, queryChar)) {
      matchedIndices.push(textIndex);

      const characterScore = scoreCharacterMatch({
        textIndex,
        lastMatchTextIndex,
        consecutiveMatches,
        atWordStart: isWordStart(textChars, textIndex),
      });

      score += characterScore.charScore - characterScore.gapPenalty;
      consecutiveMatches = characterScore.consecutiveMatches;
      lastMatchTextIndex = textIndex;
      queryIndex += 1;
    }

    textIndex += 1;
  }

  while (queryIndex < queryChars.length && isQuerySkippable(queryChars[queryIndex] ?? '')) {
    queryIndex += 1;
  }

  if (queryIndex < queryChars.length) {
    return null;
  }

  if (matchedIndices.length > 0) {
    const span = matchedIndices[matchedIndices.length - 1] - matchedIndices[0];
    score -= span * SCORE.SPAN_PENALTY;
  }

  const compactQuery = precomputed
    ? precomputed.compactQuery
    : compactComparableCharacters(queryChars, isQuerySkippable);
  if (hasContiguousCompactMatch(textChars, compactQuery)) {
    score += SCORE.CONTIGUOUS_BONUS;
  }

  return { score, matchedIndices };
}

export function compareFuzzySearchMatches(left: FuzzySearchMatch, right: FuzzySearchMatch): number {
  return right.score - left.score;
}
