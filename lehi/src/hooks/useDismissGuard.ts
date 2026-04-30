import {useNavigation, usePreventRemove} from '@react-navigation/native';
import {useRouter} from 'expo-router';
import {useCallback} from 'react';
import {Alert} from 'react-native';

export function useDismissGuard(
  hasChanges: boolean,
  options?: {dismiss?: 'back' | 'dismiss'; title?: string}
) {
  const router = useRouter();
  const navigation = useNavigation();
  const dismissMethod = options?.dismiss ?? 'dismiss';
  const alertTitle = options?.title ?? 'Discard Changes?';

  usePreventRemove(hasChanges, ({data}) => {
    Alert.alert(alertTitle, 'You have unsaved changes that will be lost.', [
      {text: 'Keep Editing', style: 'cancel'},
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  const handleClose = useCallback(() => {
    if (dismissMethod === 'dismiss') {
      router.dismiss();
    } else {
      router.back();
    }
  }, [router, dismissMethod]);

  return handleClose;
}
