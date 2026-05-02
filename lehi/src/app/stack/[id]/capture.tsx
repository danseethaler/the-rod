import {useLocalSearchParams, useRouter} from 'expo-router';
import {useColorScheme} from 'nativewind';
import React, {useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticError, hapticSuccess} from '@/lib/haptics';
import {toast} from '@/lib/toast';
import {selectStackById, useStacksStore} from '@/store/useStacksStore';

export default function CaptureNoteScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stack = useStacksStore(selectStackById(id));
  const addNoteToStack = useStacksStore(s => s.addNoteToStack);

  const [body, setBody] = useState('');

  if (!stack) {
    return null;
  }

  const onCapture = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      hapticError();
      return;
    }
    addNoteToStack(stack.id, trimmed);
    hapticSuccess();
    toast({title: 'Captured', preset: 'done'});
    router.dismiss();
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader title="Capture a thought" leading="close" />
      <RodKeyboardAvoidingView>
        <View className="flex-1 px-4">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            Drop it in unstructured. Refine later.
          </Text>
          <View className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="A thought, an angle, a question…"
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              multiline
              textAlignVertical="top"
              autoFocus
              className="px-4 py-3 text-base text-neutral-900 dark:text-white"
              style={{minHeight: 160}}
            />
          </View>
          <AnimatedPressable
            onPress={onCapture}
            disabled={!body.trim()}
            className="mt-4 bg-brand-500 rounded-2xl h-12 items-center justify-center"
            style={{opacity: body.trim() ? 1 : 0.45}}
          >
            <Text className="text-white font-semibold text-base">Capture</Text>
          </AnimatedPressable>
        </View>
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}
