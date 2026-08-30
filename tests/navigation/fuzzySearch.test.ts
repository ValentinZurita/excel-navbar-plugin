import { describe, expect, it } from 'vitest';
import { fuzzySearchMatch, precomputeSearchQuery } from '../../src/domain/navigation/fuzzySearch';

describe('fuzzySearchMatch', () => {
  it('returns null for blank queries', () => {
    expect(fuzzySearchMatch('Revenue', '   ')).toBeNull();
  });

  it('matches contiguous substrings with high scores', () => {
    const match = fuzzySearchMatch('Revenue', 'rev');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0, 1, 2]);
  });

  it('matches out-of-order characters across separators', () => {
    const match = fuzzySearchMatch('Q1 Revenue', 'q1rv');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0, 1, 3, 5]);
  });

  it('matches fuzzy subsequence queries', () => {
    const match = fuzzySearchMatch('Revenue', 'rvn');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0, 2, 4]);
  });

  it('matches queries with spaces across sheet name separators', () => {
    const match = fuzzySearchMatch('Annual_Revenue', 'an rev');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0, 1, 7, 8, 9]);
  });

  it('returns null when characters cannot be matched in order', () => {
    expect(fuzzySearchMatch('Revenue', 'xyz')).toBeNull();
  });

  it('is case-insensitive', () => {
    const match = fuzzySearchMatch('Revenue', 'REV');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0, 1, 2]);
  });

  it('ranks stronger matches above weaker subsequence matches', () => {
    const direct = fuzzySearchMatch('Revenue', 'rev');
    const indirect = fuzzySearchMatch('Previous', 'rev');

    expect(direct).not.toBeNull();
    expect(indirect).not.toBeNull();
    expect(direct!.score).toBeGreaterThan(indirect!.score);
  });

  it('matches unicode sheet names using code-point indices', () => {
    const match = fuzzySearchMatch('📊 Revenue', 'rev');

    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([2, 3, 4]);
  });

  it('produces identical matches when using precomputed search query', () => {
    const query = '  an rev  ';
    const precomputed = precomputeSearchQuery(query);

    expect(precomputed.trimmedQuery).toBe('an rev');

    const regularMatch = fuzzySearchMatch('Annual_Revenue', query);
    const precomputedMatch = fuzzySearchMatch('Annual_Revenue', query, precomputed);

    expect(precomputedMatch).toEqual(regularMatch);
    expect(precomputedMatch).not.toBeNull();
    expect(precomputedMatch?.score).toBe(regularMatch?.score);
  });

  it('matches when query contains unicode emoji code points', () => {
    const match = fuzzySearchMatch('📊 Revenue', '📊');
    expect(match).not.toBeNull();
    expect(match?.matchedIndices).toEqual([0]);
  });
});
