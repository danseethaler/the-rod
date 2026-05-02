import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {ScreenHeader} from '@/components/ScreenHeader';

export default function AboutScreen() {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={{paddingBottom: 48}}>
        <View className="px-6 pt-2 pb-1">
          <Text className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Krumb
          </Text>
        </View>

        <Section heading="Why &ldquo;Krumb&rdquo;">
          <Body>
            The name comes from the German <Italic>Krume</Italic> — the soft
            inner of a bread loaf, distinct from the crust. The crumb is what
            you actually eat: the part that nourishes, the part that holds the
            moisture. The crust holds the loaf together; the crumb is the loaf.
          </Body>
          <Pullquote
            text="Feast upon the words of Christ; for behold, the words of Christ will tell you all things what ye should do."
            cite="2 Nephi 32:3"
          />
          <Body>
            Scripture is the bread of the Word, and this app is for the part you
            sit with — the soft middle.
          </Body>
        </Section>

        <Section heading="What this is for">
          <Body>
            A scripture-thinking workspace. Not a generator. Not an oracle. A
            clean desk.
          </Body>
          <Body>
            The work of preparing a talk, or a lesson, or just thinking
            carefully about a verse — it has a real shape: gather, filter,
            arrange, enrich. The hard part isn&apos;t any of those steps. The
            hard part is the time left over after them, where revelation has
            room to do its work.
          </Body>
          <Body>
            This app exists to compress the friction of{' '}
            <Italic>gathering</Italic> and <Italic>rearranging</Italic> so that
            the time left over is for <Italic>pondering</Italic>. The Spirit
            does the sequencing. Krumb just clears the desk.
          </Body>
          <Body>
            It deliberately does not generate talks, suggest the order of items
            in a stack, auto-cluster verses into themes, or nag you to ponder on
            a streak. Those are all tempting and all wrong. Inspiration is
            non-systematizable.
          </Body>
        </Section>

        <Section heading="The four stages">
          <Stage
            label="Brainstorm"
            body="Drop scraps in. Voice memo, quick text, half a thought. No structure required. The flour and the water and the salt — you don't have to know yet what it's becoming."
          />
          <Stage
            label="Filter"
            body="Search across scripture, conference talks, your own past notes. Keep what resonates, discard the rest. This is the kneading: nothing new is being added, but the dough is changing."
          />
          <Stage
            label="Organize"
            body="Drag the kept items into a sequence. The app does not suggest order. This is where revelation does its work — distilling, in the language of D&C 121:45, “as the dews from heaven.”"
          />
          <Stage
            label="Enrich"
            body="Tap a verse to read its surrounding context. Tap a citation to read the full talk. Add your own thought to each item. This is the marinating — the patient sitting-with, the salt working in."
          />
          <Body>
            When a stack is <Italic>Bake until done</Italic>, it&apos;s not
            finished — it&apos;s resting. The dough has been shaped. The work
            now is just heat and time.
          </Body>
        </Section>

        <View className="px-6 pt-2">
          <Pullquote
            text="Wherefore do ye spend money for that which is not bread? and your labour for that which satisfieth not? hearken diligently unto me, and eat ye that which is good, and let your soul delight itself in fatness."
            cite="Isaiah 55:2"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-6 pt-6 pb-1">
      <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
        {heading}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Body({children}: {children: React.ReactNode}) {
  return (
    <Text className="text-base leading-7 text-neutral-800 dark:text-neutral-200">
      {children}
    </Text>
  );
}

function Italic({children}: {children: React.ReactNode}) {
  return <Text className="italic">{children}</Text>;
}

function Stage({label, body}: {label: string; body: string}) {
  return (
    <View>
      <Text className="text-base leading-7 text-neutral-800 dark:text-neutral-200">
        <Text className="font-semibold text-neutral-900 dark:text-white">
          {label}.
        </Text>{' '}
        {body}
      </Text>
    </View>
  );
}

function Pullquote({text, cite}: {text: string; cite: string}) {
  return (
    <View className="border-l-2 border-brand-400 dark:border-brand-500 pl-4 py-1">
      <Text className="text-base leading-7 italic text-neutral-700 dark:text-neutral-300">
        {text}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        — {cite}
      </Text>
    </View>
  );
}
