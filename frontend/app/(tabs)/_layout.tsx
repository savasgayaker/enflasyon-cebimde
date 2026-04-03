import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';

export default function TabLayout() {
  const { darkMode } = useAppStore((state) => state.settings);
  const theme = darkMode ? colors.dark : colors.light;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.surface,
          ...shadows.sm,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr.nav.home,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
          headerTitle: tr.appName,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: tr.nav.scan,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: tr.nav.products,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory" size={size} color={color} />
          ),
          headerTitle: tr.products.title,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: tr.nav.analytics,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="analytics" size={size} color={color} />
          ),
          headerTitle: tr.analytics.title,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr.nav.settings,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
          headerTitle: tr.settings.title,
        }}
      />
    </Tabs>
  );
}
