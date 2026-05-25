export interface SearchHighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Splits a sheet name into plain/highlighted segments for search result rendering.
 * Indices must come from `fuzzySearchMatch` (`[...name]` code-point indexing).
 */
export function buildSearchHighlightSegments(
  name: string,
  matchedIndices: readonly number[],
): SearchHighlightSegment[] {
  if (!matchedIndices.length) {
    return [{ text: name, highlighted: false }];
  }

  const chars = [...name];
  const highlighted = new Set(matchedIndices);
  const segments: SearchHighlightSegment[] = [];
  let buffer = '';
  let bufferHighlighted = highlighted.has(0);

  const flushBuffer = () => {
    if (!buffer) {
      return;
    }

    segments.push({ text: buffer, highlighted: bufferHighlighted });
    buffer = '';
  };

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index] ?? '';
    const isHighlighted = highlighted.has(index);

    if (buffer && isHighlighted !== bufferHighlighted) {
      flushBuffer();
    }

    bufferHighlighted = isHighlighted;
    buffer += char;
  }

  flushBuffer();
  return segments.length ? segments : [{ text: name, highlighted: false }];
}
