import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAppStore } from '../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { tr } from '../src/i18n/tr';
import { categories } from '../src/constants/categories';
import { format } from 'date-fns';
import { tr as trLocale } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { darkMode } = useAppStore((state) => state.settings);
  const { products, priceRecords, receipts } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;

  const product = products.find((p) => p.id === id);
  const category = categories.find((c) => c.id === product?.categoryId);

  // Get price history
  const priceHistory = useMemo(() => {
    if (!product) return [];
    
    return priceRecords
      .filter((r) => r.productId === product.id)
      .map((record) => {
        const receipt = receipts.find((r) => r.id === record.receiptId);
        return {
          ...record,
          storeName: receipt?.storeName || 'Bilinmeyen',
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [product, priceRecords, receipts]);

  // Calculate stats
  const stats = useMemo(() => {
    if (priceHistory.length === 0) {
      return { current: 0, min: 0, max: 0, avg: 0, change: 0 };
    }

    const prices = priceHistory.map((r) => r.unitPrice);
    const current = prices[prices.length - 1];
    const first = prices[0];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const change = first > 0 ? ((current - first) / first) * 100 : 0;

    return { current, min, max, avg, change };
  }, [priceHistory]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return priceHistory.map((record) => ({
      value: record.unitPrice,
      label: format(new Date(record.date), 'dd/MM'),
      dataPointText: `₺${record.unitPrice}`,
    }));
  }, [priceHistory]);

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <MaterialIcons name="error-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.notFoundText, { color: theme.text }]}>Ürün bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={[styles.header, { backgroundColor: category?.color || colors.primary }]}>
          <View style={styles.headerIcon}>
            <MaterialIcons
              name={(category?.icon as any) || 'inventory-2'}
              size={48}
              color={colors.white}
            />
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category?.name || 'Diğer'}</Text>
          </View>
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Son Fiyat</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                ₺{stats.current.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Değişim</Text>
              <View style={[
                styles.changeTag,
                { backgroundColor: stats.change >= 0 ? colors.error + '20' : colors.success + '20' }
              ]}>
                <MaterialIcons
                  name={stats.change >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={stats.change >= 0 ? colors.error : colors.success}
                />
                <Text style={[
                  styles.changeValue,
                  { color: stats.change >= 0 ? colors.error : colors.success }
                ]}>
                  %{Math.abs(stats.change).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Düşük</Text>
              <Text style={[styles.statValueSmall, { color: colors.success }]}>
                ₺{stats.min.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ortalama</Text>
              <Text style={[styles.statValueSmall, { color: theme.text }]}>
                ₺{stats.avg.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Yüksek</Text>
              <Text style={[styles.statValueSmall, { color: colors.error }]}>
                ₺{stats.max.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Price Chart */}
        {chartData.length > 1 && (
          <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {tr.products.priceHistory}
            </Text>
            <LineChart
              data={chartData}
              width={width - 80}
              height={200}
              spacing={Math.max(30, (width - 80) / chartData.length)}
              color={category?.color || colors.primary}
              thickness={2}
              startFillColor={category?.color || colors.primary}
              endFillColor={(category?.color || colors.primary) + '30'}
              startOpacity={0.3}
              endOpacity={0.05}
              initialSpacing={15}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.border}
              yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
              rulesColor={theme.divider}
              dataPointsColor={category?.color || colors.primary}
              dataPointsRadius={4}
              areaChart
              curved
              showTextOnDataPoints={chartData.length <= 8}
              textColor={theme.textSecondary}
              textFontSize={9}
            />
          </View>
        )}

        {/* Price History List */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Kayıt Geçmişi ({priceHistory.length})
          </Text>
          {priceHistory.slice().reverse().map((record, index) => (
            <View
              key={record.id}
              style={[styles.historyItem, { backgroundColor: theme.surface }]}
            >
              <View style={styles.historyDate}>
                <Text style={[styles.historyDay, { color: theme.text }]}>
                  {format(new Date(record.date), 'd')}
                </Text>
                <Text style={[styles.historyMonth, { color: theme.textSecondary }]}>
                  {format(new Date(record.date), 'MMM', { locale: trLocale })}
                </Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyStore, { color: theme.text }]}>
                  {record.storeName}
                </Text>
                <Text style={[styles.historyQty, { color: theme.textSecondary }]}>
                  {record.quantity} adet
                </Text>
              </View>
              <Text style={[styles.historyPrice, { color: colors.primary }]}>
                ₺{record.unitPrice.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

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
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  productName: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  statsCard: {
    margin: spacing.md,
    marginTop: -spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  statValue: {
    ...typography.h3,
  },
  statValueSmall: {
    ...typography.body,
    fontWeight: '600',
  },
  changeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  changeValue: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  chartCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  historySection: {
    paddingHorizontal: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  historyDate: {
    width: 45,
    alignItems: 'center',
  },
  historyDay: {
    ...typography.h3,
  },
  historyMonth: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  historyInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  historyStore: {
    ...typography.body,
    fontWeight: '500',
  },
  historyQty: {
    ...typography.caption,
    marginTop: 2,
  },
  historyPrice: {
    ...typography.h4,
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
