import {toast as burntToast} from 'burnt';

type ToastOptions = Parameters<typeof burntToast>[0];

export function toast(options: ToastOptions) {
  burntToast({
    duration: 1.5,
    ...options,
  });
}
