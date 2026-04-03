import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';
import { calculateInflation, calculateCategorySpending, exportToCSV } from '../../src/utils/inflation';
import { categories } from '../../src/constants/categories';
import { subMonths, subYears } from 'date-fns';

const { width } = Dimensions.get('window');

type DateRange = '1m' | '3m' | '6m' | '1y';

export default function AnalyticsScreen() {
  const { darkMode } = useAppStore((state) => state.settings);
  const { receipts, products, priceRecords } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [dateRange, setDateRange] = useState<DateRange>('3m');

  // Calculate date range bounds
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '1m': return { start: subMonths(now, 1), end: now };
      case '3m': return { start: subMonths(now, 3), end: now };
      case '6m': return { start: subMonths(now, 6), end: now };
      case '1y': return { start: subYears(now, 1), end: now };
    }
  }, [dateRange]);

  // Calculate inflation data
  const inflationData = useMemo(() => {
    return calculateInflation(priceRecords, products, dateRangeBounds);
  }, [priceRecords, products, dateRangeBounds]);

  // Calculate category spending
  const categorySpending = useMemo(() => {
    const filteredRecords = priceRecords.filter((r) => {
      const date = new Date(r.date);
      return date >= dateRangeBounds.start && date <= dateRangeBounds.end;
    });
    return calculateCategorySpending(filteredRecords, products);
  }, [priceRecords, products, dateRangeBounds]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    return categorySpending.slice(0, 6).map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return {
        value: item.percentage,
        color: category?.color || colors.category.other,
        text: `${item.percentage.toFixed(0)}%`,
        label: category?.name || 'Diğer',
      };
    });
  }, [categorySpending]);

  // Prepare bar chart data for category inflation
  const barData = useMemo(() => {
    return Object.entries(inflationData.categoryRates).map(([categoryId, rate]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        value: Math.abs(rate),
        label: category?.name.substring(0, 3) || '',
        frontColor: rate >= 0 ? colors.error : colors.success,
        topLabelComponent: () => (
          <Text style={{ color: rate >= 0 ? colors.error : colors.success, fontSize: 10, fontWeight: '600' }}>
            {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
          </Text>
        ),
      };
    }).slice(0, 8);
  }, [inflationData.categoryRates]);

  // Prepare line chart data
  const lineData = useMemo(() => {
    return inflationData.monthlyTrend.map((item) => ({
      value: item.rate,
      label: item.month,
      dataPointText: `${item.rate.toFixed(1)}%`,
    }));
  }, [inflationData.monthlyTrend]);

  const handleExport = async () => {
    try {
      const csv = exportToCSV(receipts, priceRecords, products);
      const fileName = `enflasyon_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert(tr.success, 'CSV dosyası kaydedildi: ' + fileName);
      }
    } catch (error) {
      Alert.alert(tr.error, 'Veriler dışa aktarılamadı');
    }
  };

  const hasData = priceRecords.length > 0;

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: '1m', label: tr.analytics.lastMonth },
    { key: '3m', label: tr.analytics.last3Months },
    { key: '6m', label: tr.analytics.last6Months },
    { key: '1y', label: tr.analytics.lastYear },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Date Range Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateRangeScroll}
          contentContainerStyle={styles.dateRangeContainer}
        >
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dateRangeChip,
                {
                  backgroundColor: dateRange === option.key ? colors.primary : theme.surface,
                },
              ]}
              onPress={() => setDateRange(option.key)}
            >
              <Text
                style={[
                  styles.dateRangeText,
                  { color: dateRange === option.key ? colors.white : theme.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!hasData ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="analytics" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {tr.analytics.noData}
            </Text>
          </View>
        ) : (
          <>
            {/* Personal Inflation Rate */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {tr.analytics.personalInflation}
              </Text>
              <View style={styles.inflationDisplay}>
                <View style={styles.inflationItem}>
                  <Text style={[styles.inflationValue, { color: colors.primary }]}>
                    %{inflationData.monthlyRate.toFixed(1)}
                  </Text>
                  <Text style={[styles.inflationLabel, { color: theme.textSecondary }]}>
                    {tr.home.monthly}
                  </Text>
                </View>
                <View style={[styles.inflationDivider, { backgroundColor: theme.border }]} />
                <View style={styles.inflationItem}>
                  <Text style={[styles.inflationValue, { color: colors.accent }]}>
                    %{inflationData.yearlyRate.toFixed(1)}
                  </Text>
                  <Text style={[styles.inflationLabel, { color: theme.textSecondary }]}>
                    {tr.home.yearly}
                  </Text>
                </View>
              </View>
            </View>

            {/* Inflation Trend Chart */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {tr.analytics.priceTrends}
              </Text>
              {lineData.length > 0 && (
                <LineChart
                  data={lineData}
                  width={width - 80}
                  height={180}
                  spacing={45}
                  color={colors.primary}
                  thickness={2}
                  startFillColor={colors.primary}
                  endFillColor={colors.primaryLight}
                  startOpacity={0.2}
                  endOpacity={0.05}
                  initialSpacing={10}
                  noOfSections={4}
                  yAxisColor="transparent"
                  xAxisColor={theme.border}
                  yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  rulesColor={theme.divider}
                  dataPointsColor={colors.primary}
                  dataPointsRadius={4}
                  areaChart
                  curved
                />
              )}
            </View>

            {/* Category Inflation Breakdown */}
            {barData.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {tr.analytics.categoryBreakdown}
                </Text>
                <BarChart
                  data={barData}
                  barWidth={28}
                  spacing={20}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...barData.map((d) => d.value)) * 1.3}
                  xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
                />
              </View>
            )}

            {/* Monthly Spending Pie Chart */}
            {pieData.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {tr.analytics.monthlySpending}
                </Text>
                <View style={styles.pieContainer}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={50}
                    centerLabelComponent={() => (
                      <View style={styles.pieCenter}>
                        <Text style={[styles.pieCenterValue, { color: theme.text }]}>
                          ₺{categorySpending.reduce((sum, c) => sum + c.totalSpending, 0).toFixed(0)}
                        </Text>
                        <Text style={[styles.pieCenterLabel, { color: theme.textSecondary }]}>
                          Toplam
                        </Text>
                      </View>
                    )}
                  />
                  <View style={styles.legendContainer}>
                    {pieData.map((item, index) => (
                      <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={[styles.legendValue, { color: theme.textSecondary }]}>
                          {item.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Export Button */}
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.surface }]}
              onPress={handleExport}
            >
              <MaterialIcons name="download" size={24} color={colors.primary} />
              <Text style={[styles.exportText, { color: colors.primary }]}>
                {tr.analytics.exportCSV}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateRangeScroll: {
    maxHeight: 50,
  },
  dateRangeContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateRangeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  dateRangeText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  card: {
    margin: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  inflationDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inflationItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  inflationValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  inflationLabel: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  inflationDivider: {
    width: 1,
    height: 50,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    ...typography.h4,
    fontWeight: '700',
  },
  pieCenterLabel: {
    ...typography.caption,
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    ...typography.caption,
    flex: 1,
  },
  legendValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  exportText: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
});
