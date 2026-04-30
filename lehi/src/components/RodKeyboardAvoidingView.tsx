import React from 'react';
import {KeyboardAvoidingView, Platform, type ViewProps} from 'react-native';

interface Props extends ViewProps {
  keyboardVerticalOffset?: number;
  children: React.ReactNode;
}

/**
 * Standard keyboard avoidance wrapper for The Rod. Wrap ONLY the scroll area;
 * keep header and tab bar OUTSIDE as siblings so the keyboard naturally covers
 * the tab bar without any visibility-state hacks.
 *
 * On screens with a tab bar (or any bottom safe-area chrome), pass
 * `keyboardVerticalOffset={0}` — the chrome already reserves the home-indicator
 * area, so the default 38 over-pads.
 */
export const RodKeyboardAvoidingView: React.FC<Props> = ({
  keyboardVerticalOffset = 38,
  style,
  children,
  ...rest
}) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={keyboardVerticalOffset}
    style={[{flex: 1}, style]}
    {...rest}
  >
    {children}
  </KeyboardAvoidingView>
);
