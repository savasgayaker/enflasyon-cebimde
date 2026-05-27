import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/constants/theme';

export default function RootLayout() {
  const { darkMode } = useAppStore((state) => state.settings);
  const theme = darkMode ? colors.dark : colors.light;

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="receipt-preview"
          options={{
            title: 'Fiş Önizleme',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="product-detail"
          options={{
            title: 'Ürün Detayı',
          }}
        />
        <Stack.Screen
          name="receipt-detail"
          options={{
            title: 'Fiş Detayı',
          }}
        />
        <Stack.Screen
          name="ocr-test"
          options={{
            title: 'OCR Test',
          }}
        />
      </Stack>
    </>
  );
}
