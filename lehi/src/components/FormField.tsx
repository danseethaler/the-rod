import {useColorScheme} from 'nativewind';
import React, {forwardRef} from 'react';
import type {StyleProp, TextInputProps, ViewStyle} from 'react-native';
import {Text, TextInput, View} from 'react-native';

export const INPUT_SHADOW: StyleProp<ViewStyle> = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.04,
  shadowRadius: 2,
  elevation: 1,
};

interface FormFieldProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(
  (
    {label, value, onChange, required, error, multiline, style, ...rest},
    ref
  ) => {
    const {colorScheme} = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
      <View className="mb-3">
        {label && (
          <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
            {label}
            {required ? <Text className="text-red-500"> *</Text> : null}
          </Text>
        )}
        <View style={INPUT_SHADOW}>
          <View
            className={`flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl ${
              error ? 'border border-red-400 dark:border-red-500' : ''
            }`}
          >
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChange}
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              className="flex-1 text-base text-neutral-900 dark:text-white px-3 py-3"
              multiline={multiline}
              textAlignVertical={multiline ? 'top' : 'center'}
              autoCorrect
              style={[multiline && {minHeight: 100}, style]}
              {...rest}
            />
          </View>
        </View>
        {error && (
          <Text className="text-xs text-red-500 dark:text-red-400 mt-1">
            {error}
          </Text>
        )}
      </View>
    );
  }
);

FormField.displayName = 'FormField';
