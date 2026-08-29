import {Tabs} from 'expo-router';
import {Layers, Search, Settings} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';

import {useStacksStore, type AppPrefs} from '@/store/useStacksStore';

const TAB_ROUTE_NAMES: ReadonlySet<AppPrefs['lastTab']> = new Set([
  'index',
  'stacks',
  'settings',
]);

export default function TabsLayout() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Mount-time snapshot — used as `initialRouteName`. We don't subscribe
  // because `Tabs` doesn't react to changes after mount, and we only
  // care about the value at app launch (after hydration). Hydration is
  // gated by the root layout, so by the time this component renders the
  // prefs are already populated.
  const initialTab = useStacksStore.getState().prefs.lastTab;
  const setLastTab = useStacksStore(s => s.setLastTab);

  return (
    <Tabs
      initialRouteName={initialTab}
      screenListeners={{
        focus: e => {
          // `e.target` looks like `${routeName}-${navKey}` — split off
          // the route name and persist if it's one we care about.
          const target = e.target;
          if (typeof target !== 'string') return;
          const routeName = target.split('-')[0] as AppPrefs['lastTab'];
          if (TAB_ROUTE_NAMES.has(routeName)) {
            setLastTab(routeName);
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#fbbf24' : '#b45309',
        tabBarInactiveTintColor: isDark ? '#737373' : '#a3a3a3',
        tabBarStyle: {
          backgroundColor: isDark ? '#171717' : '#ffffff',
          borderTopColor: isDark ? '#262626' : '#f5f5f5',
        },
        tabBarLabelStyle: {fontWeight: '600'},
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({color, size}) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stacks"
        options={{
          title: 'Stacks',
          tabBarIcon: ({color, size}) => <Layers size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({color, size}) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
