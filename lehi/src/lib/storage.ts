import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  // v3 — stacks gained sections. `Stack.itemIds` removed; items now live
  // under `Section.itemIds`. Old v2 data is intentionally orphaned (the
  // user opted out of a migration).
  stacks: 'rod:stacks:v3',
  sections: 'rod:sections:v3',
  stackItems: 'rod:stack-items:v3',
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
