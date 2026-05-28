import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { tr } from '../src/i18n/tr';
import { categories, suggestCategory } from '../src/constants/categories';
import type { ParsedReceipt } from '../src/services/receiptParser';

/**
 * Ekran-içi kalem tipi. Parser `unitPrice/totalPrice: number | null` döner;
 * form input'ları number bekler, bu yüzden burada null → 0 normalize edilir.
 * `needsReview` parser'dan gelir; kullanıcı kalemi düzelttiğinde otomatik
 * temizlenir (bkz. updateItem).
 */
type UIItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId: string;
  needsReview: boolean;
};

export default function ReceiptPreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string; imageUri: string }>();
  const { darkMode } = useAppStore((state) => state.settings);
  const { addReceipt, findOrCreateProduct, addPriceRecord } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;

  // Parse parser result from params
  const initialData: ParsedReceipt = useMemo(() => {
    const empty: ParsedReceipt = {
      storeName: '',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      items: [],
    };
    if (!params.data) return empty;
    try {
      return JSON.parse(params.data) as ParsedReceipt;
    } catch {
      return empty;
    }
  }, [params.data]);

  // Parser → UI sınır katmanı: null fiyatları 0'a normalize et, needsReview taşı.
  const initialItems: UIItem[] = useMemo(
    () =>
      (initialData.items ?? []).map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? 0,
        totalPrice: it.totalPrice ?? 0,
        categoryId: it.categoryId,
        needsReview: it.needsReview,
      })),
    [initialData],
  );

  const [storeName, setStoreName] = useState(initialData.storeName);
  const [date, setDate] = useState(initialData.date);
  const [items, setItems] = useState<UIItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate total
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  // Update item
  const updateItem = (
    index: number,
    field: keyof UIItem,
    value: string | number,
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === 'name') {
        item.name = value as string;
        // Auto-suggest category
        const suggestedCategory = suggestCategory(value as string);
        item.categoryId = suggestedCategory.id;
      } else if (field === 'quantity') {
        item.quantity = parseFloat(value as string) || 0;
        item.totalPrice = item.quantity * item.unitPrice;
      } else if (field === 'unitPrice') {
        item.unitPrice = parseFloat(value as string) || 0;
        item.totalPrice = item.quantity * item.unitPrice;
        // Kullanıcı fiyatı bizzat girdiğinde inceleme bayrağı düşer.
        item.needsReview = false;
      } else if (field === 'categoryId') {
        item.categoryId = value as string;
      }

      newItems[index] = item;
      return newItems;
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new item
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        categoryId: 'other',
        needsReview: false,
      },
    ]);
  };

  // Save receipt
  const handleSave = async () => {
    if (!storeName.trim()) {
      Alert.alert(tr.error, 'Lütfen mağaza adını girin');
      return;
    }

    if (items.length === 0) {
      Alert.alert(tr.error, 'Lütfen en az bir ürün ekleyin');
      return;
    }

    const invalidItems = items.filter((item) => !item.name.trim() || item.unitPrice <= 0);
    if (invalidItems.length > 0) {
      Alert.alert(tr.error, 'Tüm ürünlerin adı ve fiyatı olmalıdır');
      return;
    }

    // Parser'ın "incele" bayrağı koyduğu kalemler varsa nazik uyarı.
    const flagged = items.filter((it) => it.needsReview);
    if (flagged.length > 0) {
      const names = flagged
        .map((it) => it.name.trim() || '(adsız)')
        .slice(0, 3)
        .join(', ');
      const suffix = flagged.length > 3 ? ` (+${flagged.length - 3})` : '';
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'İnceleme gerekli',
          `Şu kalemler incelenmek üzere işaretli: ${names}${suffix}. Yine de kaydetmek istiyor musunuz?`,
          [
            { text: 'İncele', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Kaydet', onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    setIsSaving(true);

    try {
      // Create receipt
      const receiptId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const receipt = {
        id: receiptId,
        storeName: storeName.trim(),
        date,
        totalAmount,
        imageUri: params.imageUri || undefined,
        createdAt: new Date().toISOString(),
      };

      addReceipt(receipt);

      // Create products and price records
      for (const item of items) {
        const product = findOrCreateProduct(item.name.trim(), item.categoryId);
        
        const priceRecord = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          productId: product.id,
          receiptId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          date,
        };
        
        addPriceRecord(priceRecord);
      }

      Alert.alert(tr.success, 'Fiş başarıyla kaydedildi', [
        {
          text: tr.done,
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(tr.error, 'Fiş kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = (item: UIItem, index: number) => {
    // Parser bayrağına göre kart vurgusu:
    //   needsReview && totalPrice === 0 → KIRMIZI (fiyat bulunamadı, manuel girilmeli)
    //   needsReview && totalPrice > 0   → SARI (aritmetik kurtarma veya Düzen B; incele)
    //   needsReview false               → vurgu yok
    const reviewMissing = item.needsReview && item.totalPrice === 0;
    const reviewSoft = item.needsReview && item.totalPrice > 0;
    const reviewColor = reviewMissing
      ? colors.error
      : reviewSoft
        ? colors.warning
        : null;
    const reviewLabel = reviewMissing
      ? 'FİYAT GİRİN'
      : reviewSoft
        ? 'İNCELEYİN'
        : null;

    return (
      <View
        key={index}
        style={[
          styles.itemCard,
          { backgroundColor: theme.surfaceSecondary },
          reviewColor ? { borderLeftWidth: 4, borderLeftColor: reviewColor } : null,
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={[styles.itemNumber, { color: theme.textSecondary }]}>
              #{index + 1}
            </Text>
            {reviewLabel && reviewColor && (
              <View
                style={[styles.reviewBadge, { backgroundColor: reviewColor }]}
              >
                <Text style={styles.reviewBadgeText}>{reviewLabel}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => removeItem(index)}>
            <MaterialIcons name="delete-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Product Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {tr.scanner.productName}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={item.name}
            onChangeText={(value) => updateItem(index, 'name', value)}
            placeholder="Ürün adı"
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {tr.scanner.category}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: item.categoryId === cat.id ? cat.color : theme.surface,
                      borderColor: item.categoryId === cat.id ? cat.color : theme.border,
                    },
                  ]}
                  onPress={() => updateItem(index, 'categoryId', cat.id)}
                >
                  <MaterialIcons
                    name={cat.icon as any}
                    size={14}
                    color={item.categoryId === cat.id ? colors.white : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: item.categoryId === cat.id ? colors.white : theme.text },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Quantity and Price Row */}
        <View style={styles.priceRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {tr.scanner.quantity}
            </Text>
            <TextInput
              style={[styles.input, styles.inputSmall, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={item.quantity.toString()}
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1, marginHorizontal: spacing.sm }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {tr.scanner.unitPrice}
            </Text>
            <TextInput
              style={[styles.input, styles.inputSmall, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={item.unitPrice.toString()}
              onChangeText={(value) => updateItem(index, 'unitPrice', value)}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {tr.scanner.totalPrice}
            </Text>
            <View style={[styles.totalDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.totalText, { color: colors.primary }]}>
                ₺{item.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Receipt Image Preview */}
          {params.imageUri && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: params.imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Store Info */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                {tr.scanner.storeName}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="Mağaza adını girin"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                {tr.scanner.date}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          {/* Items Header */}
          <View style={styles.itemsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {tr.scanner.items} ({items.length})
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <MaterialIcons name="add" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>{tr.scanner.addItem}</Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          {items.map((item, index) => renderItem(item, index))}

          {items.length === 0 && (
            <View style={styles.emptyItems}>
              <MaterialIcons name="receipt" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Henüz ürün eklenmedi
              </Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={addItem}>
                <MaterialIcons name="add" size={20} color={colors.primary} />
                <Text style={styles.addFirstText}>İlk ürünü ekle</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <View style={styles.totalSection}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Toplam:</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              ₺{totalAmount.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <MaterialIcons name="check" size={24} color={colors.white} />
            <Text style={styles.saveButtonText}>
              {isSaving ? tr.loading : tr.scanner.confirmSave}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imagePreview: {
    height: 150,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputSmall: {
    textAlign: 'center',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemNumber: {
    ...typography.label,
  },
  reviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  reviewBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  categoryChipText: {
    ...typography.caption,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  totalDisplay: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  totalText: {
    ...typography.body,
    fontWeight: '600',
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.md,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  addFirstText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    ...typography.caption,
  },
  totalAmount: {
    ...typography.h3,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  saveButtonDisabled: {
    backgroundColor: colors.primaryDark,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
