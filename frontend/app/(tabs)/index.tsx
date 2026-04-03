import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';
import { calculateInflation } from '../../src/utils/inflation';
import { categories } from '../../src/constants/categories';
import { subMonths } from 'date-fns';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { darkMode } = useAppStore((state) => state.settings);
  const { receipts, products, priceRecords } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;

  // Calculate inflation data
  const inflationData = useMemo(() => {
    const now = new Date();
    return calculateInflation(priceRecords, products, {
      start: subMonths(now, 1),
      end: now,
    });
  }, [priceRecords, products]);

  // Get top spending category
  const topCategory = useMemo(() => {
    const categorySpending: { [key: string]: number } = {};
    priceRecords.forEach((record) => {
      const product = products.find((p) => p.id === record.productId);
      if (product) {
        categorySpending[product.categoryId] =
          (categorySpending[product.categoryId] || 0) + record.totalPrice;
      }
    });

    let maxCategory = 'food';
    let maxSpending = 0;
    Object.entries(categorySpending).forEach(([categoryId, spending]) => {
      if (spending > maxSpending) {
        maxSpending = spending;
        maxCategory = categoryId;
      }
    });

    return categories.find((c) => c.id === maxCategory)!;
  }, [priceRecords, products]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (inflationData.monthlyTrend.length === 0) {
      return [
        { value: 0, label: 'Oca' },
        { value: 0, label: 'Şub' },
        { value: 0, label: 'Mar' },
        { value: 0, label: 'Nis' },
        { value: 0, label: 'May' },
        { value: 0, label: 'Haz' },
      ];
    }
    return inflationData.monthlyTrend.map((item) => ({
      value: Math.max(0, item.rate),
      label: item.month,
    }));
  }, [inflationData.monthlyTrend]);

  const hasData = receipts.length > 0;
  const officialRate = 62.4; // TÜİK rate for comparison (example)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Personal Inflation Card */}
        <View style={[styles.inflationCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.inflationLabel}>{tr.home.personalInflation}</Text>
          <View style={styles.inflationRates}>
            <View style={styles.rateBox}>
              <Text style={styles.rateValue}>
                {hasData ? `%${inflationData.monthlyRate.toFixed(1)}` : '-%'}
              </Text>
              <Text style={styles.rateLabel}>{tr.home.monthly}</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateBox}>
              <Text style={styles.rateValue}>
                {hasData ? `%${inflationData.yearlyRate.toFixed(1)}` : '-%'}
              </Text>
              <Text style={styles.rateLabel}>{tr.home.yearly}</Text>
            </View>
          </View>

          {/* Comparison with official rate */}
          <View style={styles.comparisonBox}>
            <MaterialIcons name="compare-arrows" size={16} color={colors.accent} />
            <Text style={styles.comparisonText}>
              {tr.home.vsOfficial}:{' '}
              <Text style={styles.comparisonValue}>%{officialRate}</Text>
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="receipt-long" size={28} color={colors.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{receipts.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              {tr.home.totalReceipts}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="inventory-2" size={28} color={colors.accent} />
            <Text style={[styles.statValue, { color: theme.text }]}>{products.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              {tr.home.totalProducts}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <MaterialIcons name={topCategory.icon as any} size={28} color={topCategory.color} />
            <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>
              {topCategory.name}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              {tr.home.topCategory}
            </Text>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>{tr.home.last6Months}</Text>
          {hasData ? (
            <LineChart
              data={chartData}
              width={width - 80}
              height={180}
              spacing={45}
              color={colors.primary}
              thickness={3}
              startFillColor={colors.primary}
              endFillColor={colors.primaryLight}
              startOpacity={0.3}
              endOpacity={0.05}
              initialSpacing={10}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.border}
              yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
              rulesColor={theme.divider}
              rulesType="solid"
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              areaChart
              curved
              hideRules={false}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="show-chart" size={48} color={theme.textTertiary} />
              <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
                {tr.home.noData}
              </Text>
              <Text style={[styles.noDataSubtext, { color: theme.textTertiary }]}>
                {tr.home.startScanning}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Receipts Preview */}
        {receipts.length > 0 && (
          <View style={[styles.recentCard, { backgroundColor: theme.surface }]}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: theme.text }]}>Son Fişler</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {receipts.slice(-3).reverse().map((receipt) => (
              <TouchableOpacity
                key={receipt.id}
                style={[styles.receiptItem, { borderBottomColor: theme.divider }]}
                onPress={() => router.push({ pathname: '/receipt-detail', params: { id: receipt.id } })}
              >
                <View style={styles.receiptInfo}>
                  <Text style={[styles.receiptStore, { color: theme.text }]}>{receipt.storeName}</Text>
                  <Text style={[styles.receiptDate, { color: theme.textSecondary }]}>
                    {new Date(receipt.date).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={[styles.receiptAmount, { color: colors.primary }]}>
                  ₺{receipt.totalAmount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/scan')}
      >
        <MaterialIcons name="qr-code-scanner" size={28} color={colors.white} />
        <Text style={styles.fabText}>{tr.home.scanReceipt}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inflationCard: {
    margin: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  inflationLabel: {
    ...typography.label,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  inflationRates: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  rateValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  rateLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  rateDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  comparisonText: {
    ...typography.bodySmall,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  comparisonValue: {
    fontWeight: '700',
    color: colors.accent,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 2,
  },
  chartCard: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  chartTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noDataText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  noDataSubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  recentCard: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recentTitle: {
    ...typography.h4,
  },
  seeAllText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptStore: {
    ...typography.body,
    fontWeight: '500',
  },
  receiptDate: {
    ...typography.caption,
    marginTop: 2,
  },
  receiptAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  fabText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
});
