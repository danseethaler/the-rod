import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import {TextInput, type TextInputProps} from 'react-native';

/**
 * DictationSafeTextInput
 * ──────────────────────
 *
 * A drop-in `<TextInput>` replacement that avoids the long-standing iOS
 * "duplicate dictated text" bug, plus the related "save-on-blur loses
 * changes" problem when a screen is dismissed without blurring first.
 *
 * Background — why this component exists
 * ──────────────────────────────────────
 *
 * 1) iOS dictation duplicate-text bug
 *    facebook/react-native#36045, #36031, Expensify/App#17174.
 *
 *    When you stop dictation while the input is still focused (i.e. you
 *    don't tap away or dismiss the keyboard first), iOS commits a final
 *    transcription by re-inserting the recognized phrase into the native
 *    UITextField. React Native's *controlled* input bridge has already
 *    pushed the React `value` prop down into the same native buffer
 *    during the dictation stream, so the final commit ends up appended
 *    on top of the value React just wrote — duplicating either the
 *    whole utterance or its tail.
 *
 *    The bug only manifests when:
 *      - the input is focused at the moment dictation ends
 *      - the input is *controlled* (a `value` prop is passed)
 *
 *    Uncontrolled inputs (no `value`, only `defaultValue`) don't have
 *    this reconciliation step and never duplicate. That's the entire
 *    insight behind the workaround the React Native maintainers
 *    informally recommend in those issues, and it's what this component
 *    encodes.
 *
 * 2) `onBlur` is unreliable on screen unmount
 *    facebook/react-native#11071, #32076.
 *
 *    A "save on blur" pattern *seems* fine but breaks when:
 *      - the user is on Android, where tapping outside a field or hitting
 *        the back button often does NOT fire onBlur (it only fires
 *        consistently when focus moves to another TextInput)
 *      - the user dismisses a modal / pops the screen while the input
 *        is still focused; the native view is torn down and onBlur may
 *        not arrive before unmount
 *
 *    To cover this, the component flushes the latest text in a `useEffect`
 *    cleanup, so any debounced or onBlur-only save logic has a final
 *    chance to run via `onCommit`.
 *
 * The contract this component offers
 * ──────────────────────────────────
 *
 * - The native text buffer is the source of truth. React only observes it.
 * - You pass `initialValue` (read once at mount). You do NOT pass `value`.
 * - You receive every keystroke via `onChangeText`. Safe to write straight
 *   to a store here — because you don't pass `value` back, the input
 *   ignores your store updates for its own buffer, so there's nothing
 *   for the dictation commit to fight with.
 * - You receive a final flush via `onCommit` on both blur AND unmount.
 *   Make this idempotent — it can fire twice with the same value when a
 *   user blurs and then the screen unmounts.
 *
 * Trade-offs to be aware of
 * ─────────────────────────
 *
 * - You can't update the visible text by changing a prop. To replace it,
 *   either (a) call `setText(...)` on the forwarded ref, or (b) change
 *   the `key` on the component to force a remount.
 * - If two parts of your UI need to display & edit the same text in sync
 *   live, this component is the wrong tool — use a controlled TextInput
 *   and accept the dictation bug, or de-duplicate at the store layer.
 *   For the typical "user edits a field, app saves it" flow, this is
 *   strictly better.
 *
 * Usage
 * ─────
 *
 *   <DictationSafeTextInput
 *     initialValue={item.body}
 *     onChangeText={(t) => setBody(item.id, t)}      // saves on every keystroke
 *     onCommit={(t) => maybeFlushDebouncedSave(t)}   // optional final flush
 *     placeholder="Body"
 *     multiline
 *   />
 *
 * If the same component instance is reused for different items (e.g.
 * a list of editable rows), pass `key={item.id}` so the input remounts
 * with the right `initialValue` when the underlying item changes.
 */

/**
 * Imperative handle exposed via ref. Mirrors the subset of TextInput's
 * native methods that's actually useful for an uncontrolled input, plus
 * `setText` (which the underlying TextInput exposes only as
 * `setNativeProps({text})`) and `getText` (so callers can read the
 * latest value at submit time without subscribing to onChangeText).
 */
export interface DictationSafeTextInputHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  /** Imperatively replace the visible text. Use for programmatic resets. */
  setText: (text: string) => void;
  /** Read the latest text without waiting for onChangeText to round-trip. */
  getText: () => string;
}

export interface DictationSafeTextInputProps
  extends Omit<TextInputProps, 'value' | 'defaultValue' | 'onChangeText'> {
  /**
   * Seeded once at mount and never read again. To replace the text after
   * mount, call `setText()` on the ref or change the `key` to force a
   * remount. Defaults to '' so callers who don't have a value yet don't
   * have to pass anything.
   */
  initialValue?: string;
  /**
   * Fires on every keystroke. The text is NOT echoed back to the native
   * input, so it's safe to do a synchronous store write here without
   * triggering the dictation duplicate-text bug.
   */
  onChangeText?: (text: string) => void;
  /**
   * Fires on blur AND on unmount with the latest text. Use this to flush
   * debounced saves or any "save on blur" logic that would otherwise be
   * missed when the screen is dismissed while the input is still focused.
   * Make it idempotent — a single edit session can fire it twice (blur,
   * then unmount) with the same value.
   */
  onCommit?: (text: string) => void;
}

export const DictationSafeTextInput = forwardRef<
  DictationSafeTextInputHandle,
  DictationSafeTextInputProps
>(function DictationSafeTextInput(
  {initialValue = '', onChangeText, onCommit, onBlur, ...rest},
  ref
) {
  // The actual native input. We hold onto this ref so the imperative
  // handle below can forward focus/blur/clear/setNativeProps calls.
  const inputRef = useRef<TextInput>(null);

  // Mirror of the native buffer in JS-land. We update this on every
  // onChangeText and on imperative setText/clear so that:
  //   - getText() can return the latest synchronously
  //   - the unmount flush has a value to send to onCommit
  // Seeded with initialValue because that's what the native input is
  // showing at mount; if the user never types, that's still the value.
  const latestRef = useRef(initialValue);

  // Stash onCommit in a ref so the unmount-flush effect (which has an
  // empty dep array) always sees the *current* callback. Without this,
  // we'd capture the onCommit identity from the first render and miss
  // any later changes — a classic stale-closure bug.
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // useImperativeHandle lets us expose a typed surface to parents without
  // leaking the raw TextInput (which would tempt callers to set its
  // `value` prop and reintroduce the dictation bug). Empty deps because
  // every method reads from refs — the closure never goes stale.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => {
        inputRef.current?.clear();
        latestRef.current = '';
      },
      setText: text => {
        // setNativeProps writes directly to the underlying UIView /
        // EditText, bypassing React reconciliation. That's exactly what
        // we want — we're treating the native buffer as the source of
        // truth, so we update it imperatively rather than via a prop.
        inputRef.current?.setNativeProps({text});
        latestRef.current = text;
      },
      getText: () => latestRef.current,
    }),
    []
  );

  // Unmount flush. Runs once when the component is torn down — covers
  // the case where the screen is dismissed while the input is still
  // focused (modal close, back gesture, programmatic router.dismiss).
  // Empty deps means this runs exactly once at unmount, never on updates.
  useEffect(() => () => onCommitRef.current?.(latestRef.current), []);

  return (
    <TextInput
      // Spread caller props FIRST so our explicit overrides below always
      // win. Even though TS prevents `value`/`defaultValue`/`onChangeText`
      // from showing up in `rest` (we Omit them from the props type), this
      // ordering is the pattern that's safe by default.
      {...rest}
      ref={inputRef}
      // defaultValue is the *only* way to seed an uncontrolled TextInput.
      // It's read once on mount and ignored thereafter — which is exactly
      // the semantic we want.
      defaultValue={initialValue}
      onChangeText={text => {
        // Keep our JS mirror in sync, then forward to the caller.
        // We never pass `text` back into the input as a `value` prop,
        // which is what avoids the dictation duplication.
        latestRef.current = text;
        onChangeText?.(text);
      }}
      onBlur={e => {
        // Fire onCommit on blur as the "user finished editing" signal.
        // Idempotent contract means it's fine that the unmount flush
        // may fire it again later with the same value.
        onCommitRef.current?.(latestRef.current);
        onBlur?.(e);
      }}
    />
  );
});
