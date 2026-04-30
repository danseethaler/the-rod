import {Tabs} from 'expo-router';
import {Layers, Search, Settings} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';

export default function TabsLayout() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
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
