import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  stacks: 'rod:stacks:v1',
  stackItems: 'rod:stack-items:v1',
  prefs: 'rod:prefs:v1',
} as const;

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
