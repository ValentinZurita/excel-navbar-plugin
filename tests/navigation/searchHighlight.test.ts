import { describe, expect, it } from 'vitest';
import { buildSearchHighlightSegments } from '../../src/domain/navigation/searchHighlight';

describe('buildSearchHighlightSegments', () => {
  it('returns one plain segment when there are no matched indices', () => {
    expect(buildSearchHighlightSegments('Revenue', [])).toEqual([
      { text: 'Revenue', highlighted: false },
    ]);
  });

  it('merges contiguous highlighted characters into one segment', () => {
    expect(buildSearchHighlightSegments('Revenue', [0, 1, 2])).toEqual([
      { text: 'Rev', highlighted: true },
      { text: 'enue', highlighted: false },
    ]);
  });

  it('splits non-contiguous highlights into separate segments', () => {
    expect(buildSearchHighlightSegments('Revenue', [0, 2, 4])).toEqual([
      { text: 'R', highlighted: true },
      { text: 'e', highlighted: false },
      { text: 'v', highlighted: true },
      { text: 'e', highlighted: false },
      { text: 'n', highlighted: true },
      { text: 'ue', highlighted: false },
    ]);
  });

  it('preserves unicode characters when building segments', () => {
    expect(buildSearchHighlightSegments('📊 Revenue', [2, 3, 4])).toEqual([
      { text: '📊 ', highlighted: false },
      { text: 'Rev', highlighted: true },
      { text: 'enue', highlighted: false },
    ]);
  });
});
