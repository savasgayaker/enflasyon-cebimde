import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { tr } from '../src/i18n/tr';
import { categories } from '../src/constants/categories';
import { fisiSil } from '../src/services/sunucuYazma';
import { supabaseYazici } from '../src/services/supabaseYazici';
import { anonimOturumuGarantile } from '../src/services/supabase';

export default function ReceiptDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { darkMode } = useAppStore((state) => state.settings);
  const { receipts, priceRecords, products, deleteReceipt, deletePriceRecordsByReceipt } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;

  const receipt = receipts.find((r) => r.id === id);
  
  const items = useMemo(() => {
    if (!receipt) return [];
    
    return priceRecords
      .filter((r) => r.receiptId === receipt.id)
      .map((record) => {
        const product = products.find((p) => p.id === record.productId);
        const category = categories.find((c) => c.id === product?.categoryId);
        return {
          ...record,
          productName: product?.name || record.hamEtiket || 'Bilinmeyen Ürün',
          category,
        };
      });
  }, [receipt, priceRecords, products]);

  const handleDelete = () => {
    Alert.alert(
      tr.delete,
      tr.history.deleteConfirm,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.delete,
          style: 'destructive',
          onPress: async () => {
            if (receipt) {
              // A4-3c/S8: SILME CEVRIMICI ISLEMDIR. Sunucudan
              // silinemeyen fis cihazdan da silinmez; aksi halde
              // sunucuda oksuz kayit kalir ve hatirlayacak yer yoktur.
              let kimlik: string | null = null;
              try {
                kimlik = await anonimOturumuGarantile();
              } catch {
                kimlik = null;
              }
              const silmeSonucu = await fisiSil(supabaseYazici, kimlik, receipt.id);
              if (!silmeSonucu.gonderildi) {
                Alert.alert(tr.error, tr.silmeSunucuHatasi);
                return;
              }
              deletePriceRecordsByReceipt(receipt.id);
              deleteReceipt(receipt.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <MaterialIcons name="error-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.notFoundText, { color: theme.text }]}>Fiş bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Receipt Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          {receipt.imageUri ? (
            <Image
              source={{ uri: receipt.imageUri }}
              style={styles.receiptImage}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="receipt" size={48} color={colors.white} style={{ opacity: 0.6 }} />
          )}
          <View style={styles.headerOverlay}>
            <Text style={styles.storeName}>{receipt.storeName}</Text>
            <Text style={styles.date}>
              {new Date(receipt.date).toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Toplam Tutar</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                ₺{receipt.totalAmount.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Ürün Sayısı</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {items.length} {tr.history.items}
              </Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {tr.scanner.items}
          </Text>
          
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, { backgroundColor: theme.surface }]}
              onPress={() => { if (item.productId === null) return; router.push({ pathname: '/product-detail', params: { id: item.productId } }); }}
            >
              <View style={[styles.itemIcon, { backgroundColor: (item.category?.color || colors.category.other) + '20' }]}>
                <MaterialIcons
                  name={(item.category?.icon as any) || 'inventory-2'}
                  size={20}
                  color={item.category?.color || colors.category.other}
                />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {item.quantity}x ₺{item.unitPrice.toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.primary }]}>
                ₺{item.totalPrice.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.error} />
          <Text style={[styles.deleteText, { color: colors.error }]}>Fişi Sil</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  receiptImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  headerOverlay: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  storeName: {
    ...typography.h2,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  date: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  summaryCard: {
    margin: spacing.md,
    marginTop: -spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  summaryDivider: {
    width: 1,
    marginVertical: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  summaryValue: {
    ...typography.h3,
  },
  itemsSection: {
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    ...typography.body,
    fontWeight: '500',
  },
  itemMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  itemTotal: {
    ...typography.body,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  deleteText: {
    ...typography.body,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...typography.h4,
    marginTop: spacing.md,
  },
});
