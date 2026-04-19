import { describe, expect, it } from 'vitest';
import { moveWorksheetId } from '../../src/domain/navigation/utils';

describe('moveWorksheetId', () => {
  it('treats NaN as 0; +Infinity clamps to end (length after removal)', () => {
    expect(moveWorksheetId(['a', 'b'], 'b', Number.NaN)).toEqual(['b', 'a']);
    expect(moveWorksheetId(['a', 'b'], 'b', Number.POSITIVE_INFINITY)).toEqual(['a', 'b']);
  });

  it('truncates fractional targetIndex toward zero', () => {
    expect(moveWorksheetId(['a', 'b', 'c'], 'c', 1.9)).toEqual(['a', 'c', 'b']);
  });
});
