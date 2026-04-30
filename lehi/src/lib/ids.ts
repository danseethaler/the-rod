// Lightweight ID helper. UUIDs would be overkill for a local-only app.
export const newId = (): string =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
