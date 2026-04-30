import {useRouter} from 'expo-router';
import React, {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {FormField} from '@/components/FormField';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticError, hapticSuccess} from '@/lib/haptics';
import {toast} from '@/lib/toast';
import {useStacksStore} from '@/store/useStacksStore';

export default function NewStackScreen() {
  const router = useRouter();
  const createStack = useStacksStore((s) => s.createStack);

  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>();

  // No dismiss guard here on purpose — this is a one-field form. If the user
  // swipes away without saving, the cost is retyping a 4-word title. Adding
  // usePreventRemove would force us to also reconcile its alert with the
  // navigation we trigger on save (router.dismiss → router.push), which is
  // where the original Maximum-update-depth + Discard-Changes race came from.

  const onCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give your stack a working title');
      hapticError();
      return;
    }
    const stack = createStack(trimmed);
    hapticSuccess();
    toast({title: 'Stack created', preset: 'done'});
    // Replace the form sheet with the stack detail rather than dismiss-then-push.
    // dismiss + push on the next frame races: the form sheet's exit animation
    // and the new push collide, and on a fresh stack the detail screen mounts
    // while the form sheet is still tearing down.
    router.replace({pathname: '/stack/[id]', params: {id: stack.id}});
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <RodKeyboardAvoidingView keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{paddingBottom: 32}}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title="New stack" leading="close" />

          <View
            className="px-4"
            style={{maxWidth: 500, width: '100%', alignSelf: 'center'}}
          >
            <Text className="text-base text-neutral-500 dark:text-neutral-400 mb-4 leading-6">
              A stack is a draft talk. Start with a working title — you can
              change it later. Don't aim for a clever angle yet; just a
              handle.
            </Text>

            <FormField
              label="Working title"
              value={title}
              onChange={(v) => {
                setTitle(v);
                if (error) setError(undefined);
              }}
              required
              placeholder="e.g. Holding fast through the mist"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onCreate}
              error={error}
            />

            <AnimatedPressable
              onPress={onCreate}
              className="mt-4 bg-brand-500 rounded-2xl h-12 items-center justify-center"
            >
              <Text className="text-white font-semibold text-base">
                Create stack
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}
