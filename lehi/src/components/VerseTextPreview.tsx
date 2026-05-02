import {useColorScheme} from 'nativewind';
import React, {useMemo} from 'react';
import {Text, type TextStyle, View} from 'react-native';

import {parseVerseMarkdown, type CharFormat} from '@/lib/verseFormat';

interface Props {
  /** Bear-flavored markdown for the verse(s). Multiple verses can be joined. */
  markdown: string;
  /** Truncate to this many lines (default 2). */
  numberOfLines?: number;
}

/**
 * Read-only inline-formatted preview of verse markdown. Used by the
 * collapsed outline row to show what the verse looks like *as it'll
 * read*, without exposing the raw `**` / `==` / `_` markers.
 *
 * Doesn't render highlight as a background — the outline excerpt is
 * already a muted secondary line, and a yellow band there fights with
 * the row's hierarchy. Bold / italic / underline are honored.
 */
export function VerseTextPreview({markdown, numberOfLines = 2}: Props) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const runs = useMemo(() => buildRuns(markdown), [markdown]);

  const baseColor = isDark ? '#a3a3a3' : '#737373';

  return (
    <View style={{flexDirection: 'row'}}>
      <Text
        numberOfLines={numberOfLines}
        style={{flex: 1, color: baseColor, fontSize: 14, lineHeight: 20}}
      >
        {runs.map((run, i) => (
          <Text key={i} style={runStyle(run.format)}>
            {run.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

interface FormattedRun {
  text: string;
  format: CharFormat;
}

/**
 * Parse the markdown and group consecutive characters that share the same
 * format flags into one run, so we can render them as a single styled
 * `<Text>` span instead of one span per character.
 */
function buildRuns(md: string): FormattedRun[] {
  const parsed = parseVerseMarkdown(md);
  const {display, formats} = parsed;
  if (!display.length) return [];

  const runs: FormattedRun[] = [];
  let runStart = 0;
  for (let i = 1; i <= display.length; i += 1) {
    const here = formats[i];
    const prev = formats[i - 1];
    const boundary = i === display.length || !sameFormat(prev, here);
    if (boundary) {
      runs.push({
        text: display.slice(runStart, i),
        format: prev,
      });
      runStart = i;
    }
  }
  return runs.filter(r => r.text.length > 0);
}

function sameFormat(a: CharFormat, b: CharFormat): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.highlight === b.highlight
  );
}

function runStyle(f: CharFormat): TextStyle {
  const style: TextStyle = {};
  if (f.bold) style.fontWeight = '700';
  if (f.italic) style.fontStyle = 'italic';
  if (f.underline) style.textDecorationLine = 'underline';
  return style;
}
