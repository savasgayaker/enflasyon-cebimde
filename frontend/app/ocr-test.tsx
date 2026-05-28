import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../src/constants/theme';
import { useAppStore } from '../src/store/useAppStore';
import {
  extractTextFromImage,
  type OCRRawResult,
} from '../src/services/ocrService';
import {
  parseReceipt,
  type ParsedReceipt,
} from '../src/services/receiptParser';

export default function OcrTestScreen() {
  const { darkMode } = useAppStore((state) => state.settings);
  const theme = darkMode ? colors.dark : colors.light;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<OCRRawResult | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOcr = async (uri: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setParsed(null);
    try {
      const ocr = await extractTextFromImage(uri);
      setResult(ocr);
      setParsed(parseReceipt(ocr));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
      setError(`OCR başarısız: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!picked.canceled && picked.assets[0]) {
      setImageUri(picked.assets[0].uri);
      await runOcr(picked.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Kamerayı kullanmak için izin vermelisiniz.');
      return;
    }
    const captured = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!captured.canceled && captured.assets[0]) {
      setImageUri(captured.assets[0].uri);
      await runOcr(captured.assets[0].uri);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.fullText);
    Alert.alert('Kopyalandı', 'Ham metin panoya kopyalandı.');
  };

  const handleCopyFixture = async () => {
    if (!result) return;
    // parser-fixtures/<isim>.json formatına uygun şablon — kullanıcı `name` ve
    // `expected` alanlarını gerekirse düzenler. expected, parser'ın çıktısıyla
    // önceden doldurulur ki kullanıcı sadece yanlışları düzeltmek zorunda kalsın.
    const fixture = {
      name: 'TODO-mağaza-tarih',
      raw: result,
      expected: parsed
        ? {
            storeName: parsed.storeName,
            date: parsed.date,
            totalAmount: parsed.totalAmount,
          }
        : {},
    };
    await Clipboard.setStringAsync(JSON.stringify(fixture, null, 2));
    Alert.alert(
      'Kopyalandı',
      'Fixture JSON panoda. parser-fixtures/<isim>.json olarak kaydet.',
    );
  };

  const handleReset = () => {
    setImageUri(null);
    setResult(null);
    setParsed(null);
    setError(null);
    setIsProcessing(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['bottom']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            OCR Test (Geliştirici)
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Bu ekran, ML Kit metin tanımanın çıktısını ham haliyle görmek için
            kullanılır. Üretimde kullanıcıya gösterilmez.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handlePickFromGallery}
            disabled={isProcessing}
          >
            <MaterialIcons name="photo-library" size={22} color={colors.white} />
            <Text style={styles.actionButtonText}>Galeriden Seç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleTakePhoto}
            disabled={isProcessing}
          >
            <MaterialIcons name="camera-alt" size={22} color={colors.white} />
            <Text style={styles.actionButtonText}>Fotoğraf Çek</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <View
            style={[styles.imageCard, { backgroundColor: theme.surface }]}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {isProcessing && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.statusText, { color: theme.textSecondary }]}
            >
              Metin çıkarılıyor...
            </Text>
          </View>
        )}

        {error && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: colors.error },
            ]}
          >
            <MaterialIcons name="error-outline" size={28} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {result && (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Ham Metin (fullText)
                </Text>
                <Text
                  style={[
                    styles.confidence,
                    { color: theme.textSecondary },
                  ]}
                >
                  Güven: {(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>
              <View
                style={[
                  styles.codeBox,
                  { backgroundColor: theme.surfaceSecondary },
                ]}
              >
                <ScrollView style={styles.codeScroll} nestedScrollEnabled>
                  <Text style={[styles.codeText, { color: theme.text }]}>
                    {result.fullText || '(metin tespit edilmedi)'}
                  </Text>
                </ScrollView>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Satırlar ({result.lines.length})
              </Text>
              {result.lines.length === 0 ? (
                <Text
                  style={[styles.statusText, { color: theme.textSecondary }]}
                >
                  Satır tespit edilmedi.
                </Text>
              ) : (
                result.lines.map((line, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.lineRow,
                      { borderBottomColor: theme.divider },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lineIndex,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lineText, { color: theme.text }]}>
                        {line.text}
                      </Text>
                      <Text
                        style={[
                          styles.lineFrame,
                          { color: theme.textTertiary },
                        ]}
                      >
                        y:{Math.round(line.frame.top)}–
                        {Math.round(line.frame.bottom)} · x:
                        {Math.round(line.frame.left)}–
                        {Math.round(line.frame.right)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Bloklar ({result.blocks.length})
              </Text>
              {result.blocks.map((block, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.blockBox,
                    { backgroundColor: theme.surfaceSecondary },
                  ]}
                >
                  <Text
                    style={[styles.blockHeader, { color: theme.textSecondary }]}
                  >
                    Blok #{idx + 1} · {block.lines.length} satır
                  </Text>
                  <Text style={[styles.blockText, { color: theme.text }]}>
                    {block.text}
                  </Text>
                </View>
              ))}
            </View>

            {parsed && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Parser Çıktısı
                </Text>
                <View style={styles.parsedRow}>
                  <Text
                    style={[
                      styles.parsedLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Mağaza
                  </Text>
                  <Text style={[styles.parsedValue, { color: theme.text }]}>
                    {parsed.storeName || '(bulunamadı)'}
                  </Text>
                </View>
                <View style={styles.parsedRow}>
                  <Text
                    style={[
                      styles.parsedLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Tarih
                  </Text>
                  <Text style={[styles.parsedValue, { color: theme.text }]}>
                    {parsed.date}
                  </Text>
                </View>
                <View style={styles.parsedRow}>
                  <Text
                    style={[
                      styles.parsedLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Toplam
                  </Text>
                  <Text
                    style={[styles.parsedValue, { color: colors.primary }]}
                  >
                    ₺{parsed.totalAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.parsedRow}>
                  <Text
                    style={[
                      styles.parsedLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Ürün sayısı
                  </Text>
                  <Text style={[styles.parsedValue, { color: theme.text }]}>
                    {parsed.items.length}{' '}
                    <Text
                      style={[
                        styles.parsedHint,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {"(M4'te eklenecek)"}
                    </Text>
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {(result || error || imageUri) && (
          <View style={styles.footerActions}>
            {result && (
              <>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.primary },
                  ]}
                  onPress={handleCopy}
                >
                  <MaterialIcons
                    name="content-copy"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.primary },
                    ]}
                  >
                    Ham Metni Kopyala
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.accent },
                  ]}
                  onPress={handleCopyFixture}
                >
                  <MaterialIcons
                    name="data-object"
                    size={20}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.accent },
                    ]}
                  >
                    {"OCR JSON'u Kopyala"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: theme.textSecondary },
              ]}
              onPress={handleReset}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={theme.textSecondary}
              />
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: theme.textSecondary },
                ]}
              >
                Sıfırla
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  imageCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  image: {
    width: '100%',
    height: 240,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.h4,
  },
  confidence: {
    ...typography.caption,
    fontWeight: '600',
  },
  codeBox: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  codeScroll: {
    maxHeight: 240,
  },
  codeText: {
    ...typography.bodySmall,
    fontFamily: 'Courier',
  },
  statusText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  lineRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  lineIndex: {
    ...typography.caption,
    width: 28,
    fontWeight: '600',
  },
  lineText: {
    ...typography.bodySmall,
  },
  lineFrame: {
    ...typography.caption,
    fontFamily: 'Courier',
    marginTop: 2,
  },
  blockBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  blockHeader: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  blockText: {
    ...typography.bodySmall,
  },
  parsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  parsedLabel: {
    ...typography.bodySmall,
  },
  parsedValue: {
    ...typography.body,
    fontWeight: '600',
  },
  parsedHint: {
    ...typography.caption,
    fontWeight: '400',
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
