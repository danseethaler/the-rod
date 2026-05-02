import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {StatusBar} from 'expo-status-bar';
import {useColorScheme} from 'nativewind';
import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {KeyboardProvider} from 'react-native-keyboard-controller';

import {useStacksStore} from '@/store/useStacksStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function HydrationGate({children}: {children: React.ReactNode}) {
  const hydrated = useStacksStore(s => s.hydrated);
  const hydrate = useStacksStore(s => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [hydrated]);

  if (!hydrated) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardProvider>
        <HydrationGate>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack>
              <Stack.Screen name="(tabs)" options={{headerShown: false}} />
              <Stack.Screen
                name="stack/new"
                options={{
                  headerShown: false,
                  presentation: 'formSheet',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="stack/[id]/index"
                options={{headerShown: false}}
              />
              <Stack.Screen
                name="stack/[id]/add"
                options={{
                  headerShown: false,
                  presentation: 'formSheet',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="stack/[id]/export"
                options={{
                  headerShown: false,
                  presentation: 'formSheet',
                  animation: 'slide_from_bottom',
                  sheetAllowedDetents: 'fitToContents' as never,
                }}
              />
              <Stack.Screen name="about" options={{headerShown: false}} />
              <Stack.Screen
                name="import-preview"
                options={{
                  headerShown: false,
                  presentation: 'formSheet',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="verse" options={{headerShown: false}} />
              <Stack.Screen
                name="stack-picker"
                options={{
                  headerShown: false,
                  presentation: 'formSheet',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
          </ThemeProvider>
        </HydrationGate>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
