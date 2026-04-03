import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useAppStore } from '../src/store/useAppStore';
import { colors, spacing, borderRadius, typography } from '../src/constants/theme';
import { tr } from '../src/i18n/tr';

const { width } = Dimensions.get('window');

const tutorialSteps = [
  { icon: 'touch-app' as const, text: tr.onboarding.tutorial.step1 },
  { icon: 'crop-free' as const, text: tr.onboarding.tutorial.step2 },
  { icon: 'edit' as const, text: tr.onboarding.tutorial.step3 },
  { icon: 'analytics' as const, text: tr.onboarding.tutorial.step4 },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const handleNext = async () => {
    if (currentIndex === 2) {
      completeOnboarding();
      router.replace('/(tabs)');
    } else {
      if (currentIndex === 1 && !permission?.granted) {
        await requestPermission();
      }
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderWelcome = () => (
    <View style={styles.slideContent}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="trending-up" size={80} color={colors.white} />
      </View>
      <Text style={styles.title}>{tr.onboarding.welcome.title}</Text>
      <Text style={styles.subtitle}>{tr.onboarding.welcome.subtitle}</Text>
      <Text style={styles.description}>{tr.onboarding.welcome.description}</Text>
    </View>
  );

  const renderPermission = () => (
    <View style={styles.slideContent}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="camera-alt" size={80} color={colors.white} />
      </View>
      <Text style={styles.title}>{tr.onboarding.camera.title}</Text>
      <Text style={styles.description}>{tr.onboarding.camera.description}</Text>
      
      <View style={styles.permissionStatus}>
        <MaterialIcons
          name={permission?.granted ? 'check-circle' : 'error-outline'}
          size={24}
          color={permission?.granted ? colors.success : colors.accent}
        />
        <Text style={styles.permissionText}>
          {permission?.granted ? 'İzin verildi' : 'İzin gerekli'}
        </Text>
      </View>
    </View>
  );

  const renderTutorial = () => (
    <View style={styles.slideContent}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="receipt-long" size={80} color={colors.white} />
      </View>
      <Text style={styles.title}>{tr.onboarding.tutorial.title}</Text>
      
      <View style={styles.tutorialContainer}>
        {tutorialSteps.map((step, index) => (
          <View key={index} style={styles.tutorialStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <MaterialIcons
              name={step.icon}
              size={28}
              color={colors.accent}
              style={styles.stepIcon}
            />
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>{tr.onboarding.skip}</Text>
      </TouchableOpacity>

      {currentIndex === 0 && renderWelcome()}
      {currentIndex === 1 && renderPermission()}
      {currentIndex === 2 && renderTutorial()}

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === 2
              ? tr.onboarding.start
              : currentIndex === 1
              ? tr.onboarding.camera.allow
              : tr.next}
          </Text>
          <MaterialIcons name="arrow-forward" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
  },
  skipText: {
    color: colors.white,
    fontSize: 16,
    opacity: 0.8,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 24,
  },
  tutorialContainer: {
    width: '100%',
    marginTop: spacing.lg,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  stepIcon: {
    marginRight: spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: colors.white,
    flex: 1,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  permissionText: {
    color: colors.white,
    marginLeft: spacing.sm,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: colors.white,
    width: 24,
  },
  nextButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
});
