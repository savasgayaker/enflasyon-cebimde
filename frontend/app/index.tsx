import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/constants/theme';

export default function Index() {
  const router = useRouter();
  const onboardingComplete = useAppStore((state) => state.settings.onboardingComplete);

  useEffect(() => {
    // Small delay to ensure proper navigation
    const timer = setTimeout(() => {
      if (onboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [onboardingComplete, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
