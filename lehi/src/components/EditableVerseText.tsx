import {useColorScheme} from 'nativewind';
import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {hapticSelection} from '@/lib/haptics';
import {
  parseVerseMarkdown,
  tokenizeDisplay,
  type CharFormat,
  type DisplayToken,
} from '@/lib/verseFormat';

export interface VerseSelection {
  /** Inclusive token index. */
  startToken: number;
  /** Inclusive token index. End ≥ start. */
  endToken: number;
}

/**
 * Selection arrives as primitive props (not a `VerseSelection` object)
 * so the parent can pass `null` for un-selected verses without
 * allocating a new object reference each render. That lets `React.memo`
 * actually skip re-renders on unrelated tap activity.
 */
export interface EditableVerseTextProps {
  itemId: string;
  verseNumber: number;
  /** Bear-flavored markdown for this verse. */
  markdown: string;
  startToken: number | null;
  endToken: number | null;
  onSelectionChange: (next: VerseSelection | null) => void;
}

const FONT_SIZE = 16;
const LINE_HEIGHT = 24;

/**
 * Word-level selectable verse text with rounded selection / highlight
 * backgrounds. RN ignores `borderRadius` on inline `<Text>` spans (the
 * bg is drawn as flat NSAttributedString attributes), so we lay tokens
 * out via flex-wrap instead — each word and whitespace token is its
 * own flex item that can carry its own bg + radius.
 *
 * Run-edge detection is applied so adjacent tokens with the same bg
 * read as a single rounded pill: only the outermost token in each run
 * gets a radius on its outer side.
 *
 * Selection state is owned by the parent so the bottom action bar is
 * rendered once for the whole stack-detail screen.
 */
export const EditableVerseText = React.memo(function EditableVerseText({
  markdown,
  startToken,
  endToken,
  onSelectionChange,
}: EditableVerseTextProps) {
  const selection = useMemo<VerseSelection | null>(
    () =>
      startToken == null || endToken == null
        ? null
        : {startToken, endToken},
    [startToken, endToken]
  );
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {parsed, tokens} = useMemo(() => {
    const p = parseVerseMarkdown(markdown);
    return {parsed: p, tokens: tokenizeDisplay(p.display)};
  }, [markdown]);

  const selectedTokenSet = useMemo(() => {
    if (!selection) return new Set<number>();
    const lo = Math.min(selection.startToken, selection.endToken);
    const hi = Math.max(selection.startToken, selection.endToken);
    const out = new Set<number>();
    for (let i = lo; i <= hi; i += 1) out.add(i);
    return out;
  }, [selection]);

  const tokenFormats = useMemo(
    () => tokens.map(t => computeTokenFormat(parsed.formats, t)),
    [tokens, parsed.formats]
  );

  const SELECTION_BG = isDark ? '#fbbf2455' : '#fde68a';
  const HIGHLIGHT_BG = isDark ? '#fbbf2433' : '#fef3c7';
  const TEXT_COLOR = isDark ? '#f5f5f5' : '#171717';
  const RADIUS = 4;

  const tokenBgs = useMemo<(string | null)[]>(
    () =>
      tokens.map((_, i) => {
        if (selectedTokenSet.has(i)) return SELECTION_BG;
        if (tokenFormats[i].highlight) return HIGHLIGHT_BG;
        return null;
      }),
    [tokens, selectedTokenSet, tokenFormats, SELECTION_BG, HIGHLIGHT_BG]
  );

  const onTapWord = (tokenIndex: number) => {
    hapticSelection();
    if (!selection) {
      onSelectionChange({startToken: tokenIndex, endToken: tokenIndex});
      return;
    }
    if (selectedTokenSet.has(tokenIndex)) {
      onSelectionChange(null);
      return;
    }
    onSelectionChange({startToken: selection.startToken, endToken: tokenIndex});
  };

  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start'}}>
      {tokens.map((tok, idx) => {
        const fmt = tokenFormats[idx];
        const bg = tokenBgs[idx];
        const isLeftEdge = bg != null && tokenBgs[idx - 1] !== bg;
        const isRightEdge = bg != null && tokenBgs[idx + 1] !== bg;

        // Underline is drawn as a wrapper border so it stays continuous
        // across adjacent flex items (RN's per-Text textDecorationLine
        // breaks the visual line at every token boundary). Every token
        // reserves a 1px transparent bottom border so the row height is
        // consistent whether or not anything is underlined.
        const wrapperStyle = {
          backgroundColor: bg ?? undefined,
          borderTopLeftRadius: isLeftEdge ? RADIUS : 0,
          borderBottomLeftRadius: isLeftEdge ? RADIUS : 0,
          borderTopRightRadius: isRightEdge ? RADIUS : 0,
          borderBottomRightRadius: isRightEdge ? RADIUS : 0,
          borderBottomWidth: 1,
          borderBottomColor: fmt.underline ? TEXT_COLOR : 'transparent',
        };

        const textStyle = {
          color: TEXT_COLOR,
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          ...formatToTextStyle(fmt),
        };

        if (!tok.isWord) {
          return (
            <View key={idx} style={wrapperStyle}>
              <Text style={textStyle}>{tok.text}</Text>
            </View>
          );
        }

        return (
          <AnimatedPressable
            key={idx}
            onPress={() => onTapWord(idx)}
            style={wrapperStyle}
            accessibilityLabel={`Word ${tok.text}`}
          >
            <Text style={textStyle}>{tok.text}</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
});

/**
 * Reduce per-character format flags across a token's char range to a
 * single format set.
 */
function computeTokenFormat(
  formats: CharFormat[],
  tok: DisplayToken
): CharFormat {
  if (tok.start >= formats.length) {
    return {bold: false, italic: false, underline: false, highlight: false};
  }
  let bold = true;
  let italic = true;
  let underline = true;
  let highlight = true;
  for (let i = tok.start; i < tok.end; i += 1) {
    const f = formats[i];
    if (!f.bold) bold = false;
    if (!f.italic) italic = false;
    if (!f.underline) underline = false;
    if (!f.highlight) highlight = false;
  }
  return {bold, italic, underline, highlight};
}

/**
 * Format styles that apply per-token. Background color and underline
 * are intentionally not in here — the wrapper paints both so the
 * decoration reads as one continuous shape across adjacent tokens.
 */
function formatToTextStyle(f: CharFormat) {
  const style: Record<string, unknown> = {};
  if (f.bold) style.fontWeight = '700';
  if (f.italic) style.fontStyle = 'italic';
  return style;
}

/**
 * Helper used by the parent screen to look up the character span for a
 * token-index range. Re-tokenizing here mirrors what the component does
 * internally so transforms operate on the same indices the user saw.
 */
export function selectionToCharRange(
  markdown: string,
  selection: VerseSelection
): {start: number; end: number} | null {
  const parsed = parseVerseMarkdown(markdown);
  const tokens = tokenizeDisplay(parsed.display);
  const lo = Math.min(selection.startToken, selection.endToken);
  const hi = Math.max(selection.startToken, selection.endToken);
  if (lo < 0 || hi >= tokens.length) return null;
  return {start: tokens[lo].start, end: tokens[hi].end};
}
