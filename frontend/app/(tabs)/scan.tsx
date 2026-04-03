import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';
import { processReceipt } from '../../src/utils/mockOCR';
import { useAppStore } from '../../src/store/useAppStore';

const { width, height } = Dimensions.get('window');

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef<CameraView>(null);
  const { darkMode } = useAppStore((state) => state.settings);
  const theme = darkMode ? colors.dark : colors.light;

  const handleCapture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        if (photo?.uri) {
          // Process the receipt (mock OCR)
          const result = await processReceipt(photo.uri);
          
          // Navigate to preview with the OCR result
          router.push({
            pathname: '/receipt-preview',
            params: {
              data: JSON.stringify(result),
              imageUri: photo.uri,
            },
          });
        }
      } catch (error) {
        console.error('Capture error:', error);
        Alert.alert(tr.error, 'Fiş yakalanamadı. Lütfen tekrar deneyin.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setIsProcessing(true);
        const ocrResult = await processReceipt(result.assets[0].uri);
        
        router.push({
          pathname: '/receipt-preview',
          params: {
            data: JSON.stringify(ocrResult),
            imageUri: result.assets[0].uri,
          },
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      setIsProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    const emptyResult = {
      storeName: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      totalAmount: 0,
    };
    
    router.push({
      pathname: '/receipt-preview',
      params: {
        data: JSON.stringify(emptyResult),
        imageUri: '',
      },
    });
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{tr.loading}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={80} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            {tr.onboarding.camera.title}
          </Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            {tr.onboarding.camera.description}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{tr.onboarding.camera.allow}</Text>
          </TouchableOpacity>
          
          {/* Manual entry option */}
          <TouchableOpacity style={styles.manualEntryButton} onPress={handleManualEntry}>
            <MaterialIcons name="edit" size={20} color={colors.primary} />
            <Text style={[styles.manualEntryText, { color: colors.primary }]}>
              {tr.scanner.manualEntry}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.scanner.title}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <MaterialIcons name="flip-camera-android" size={28} color={colors.white} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Frame Guide Overlay */}
        <View style={styles.frameOverlay}>
          <View style={styles.frameGuide}>
            <View style={[styles.frameCorner, styles.topLeft]} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
          </View>
          <Text style={styles.frameText}>{tr.scanner.frameGuide}</Text>
        </View>

        {/* Controls */}
        <SafeAreaView style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleGalleryPick}>
            <MaterialIcons name="photo-library" size={28} color={colors.white} />
            <Text style={styles.controlText}>{tr.scanner.gallery}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureButton,
              isProcessing && styles.captureButtonDisabled,
            ]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <MaterialIcons name="hourglass-empty" size={32} color={colors.white} />
            ) : (
              <MaterialIcons name="camera" size={40} color={colors.white} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleManualEntry}>
            <MaterialIcons name="edit" size={28} color={colors.white} />
            <Text style={styles.controlText}>{tr.scanner.manualEntry}</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <MaterialIcons name="receipt-long" size={48} color={colors.white} />
            <Text style={styles.processingText}>{tr.scanner.processing}</Text>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.white,
  },
  frameOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameGuide: {
    width: width * 0.85,
    height: height * 0.55,
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  frameText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  controlButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  controlText: {
    ...typography.caption,
    color: colors.white,
    marginTop: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.lg,
  },
  captureButtonDisabled: {
    backgroundColor: colors.primaryDark,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    ...typography.h4,
    color: colors.white,
    marginTop: spacing.md,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  permissionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  manualEntryText: {
    ...typography.body,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});
