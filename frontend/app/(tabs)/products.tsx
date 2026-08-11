import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';
import { categories, Category } from '../../src/constants/categories';
import { urunleriGrupla } from '../../src/utils/urunGruplama';
import { listeSatirlariniKur } from '../../src/utils/urunListesi';

export default function ProductsScreen() {
  const router = useRouter();
  const { darkMode } = useAppStore((state) => state.settings);
  const { products, priceRecords } = useAppStore();
  const theme = darkMode ? colors.dark : colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Calculate product data with price info
  // M8-5b: ayni tekil urunun kayitlari tek satirda toplanir.
  // Kurulum saf modulde; ekran cagirir, kategoriyi sabit
  // katalogdan zenginlestirir ve basar (S7).
  const productData = useMemo(
    () =>
      listeSatirlariniKur(
        urunleriGrupla(products).gruplar,
        products,
        priceRecords,
      ).map((satir) => ({
        ...satir,
        category: categories.find((c) => c.id === satir.categoryId),
      })),
    [products, priceRecords],
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = productData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
    }
    
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }
    
    return filtered.sort((a, b) => b.recordCount - a.recordCount);
  }, [productData, searchQuery, selectedCategory]);

  // Group by category
  const groupedProducts = useMemo(() => {
    if (selectedCategory) {
      return [{ category: categories.find((c) => c.id === selectedCategory)!, products: filteredProducts }];
    }
    
    const groups: { category: Category; products: typeof filteredProducts }[] = [];
    
    categories.forEach((category) => {
      const categoryProducts = filteredProducts.filter((p) => p.categoryId === category.id);
      if (categoryProducts.length > 0) {
        groups.push({ category, products: categoryProducts });
      }
    });
    
    return groups;
  }, [filteredProducts, selectedCategory]);

  const renderProduct = (product: typeof productData[0]) => (
    <TouchableOpacity
      key={product.id}
      style={[styles.productCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push({ pathname: '/product-detail', params: { id: product.id } })}
    >
      <View style={[styles.productIcon, { backgroundColor: product.category?.color + '20' }]}>
        <MaterialIcons
          name={product.category?.icon as any || 'inventory-2'}
          size={24}
          color={product.category?.color || colors.primary}
        />
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.productMeta, { color: theme.textSecondary }]}>
          {product.recordCount} kayıt
        </Text>
      </View>
      <View style={styles.productPrice}>
        <Text style={[styles.priceText, { color: theme.text }]}>
          ₺{product.lastPrice.toFixed(2)}
        </Text>
        {product.priceChange !== 0 && (
          <View style={[
            styles.changeTag,
            { backgroundColor: product.priceChange > 0 ? colors.error + '20' : colors.success + '20' }
          ]}>
            <MaterialIcons
              name={product.priceChange > 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={product.priceChange > 0 ? colors.error : colors.success}
            />
            <Text style={[
              styles.changeText,
              { color: product.priceChange > 0 ? colors.error : colors.success }
            ]}>
              %{Math.abs(product.priceChange).toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="search" size={24} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={tr.search}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: !selectedCategory ? colors.primary : theme.surface },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryChipText,
            { color: !selectedCategory ? colors.white : theme.text }
          ]}>
            {tr.products.allCategories}
          </Text>
        </TouchableOpacity>
        {categories.slice(0, -1).map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              { 
                backgroundColor: selectedCategory === category.id 
                  ? category.color 
                  : theme.surface 
              },
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === category.id ? null : category.id
            )}
          >
            <MaterialIcons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? colors.white : category.color}
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.categoryChipText,
              { color: selectedCategory === category.id ? colors.white : theme.text }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products List */}
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory-2" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {tr.products.noProducts}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {tr.products.firstScan}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color={colors.white} />
            <Text style={styles.emptyButtonText}>{tr.home.scanReceipt}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {groupedProducts.map(({ category, products: categoryProducts }) => (
            <View key={category.id} style={styles.categoryGroup}>
              <View style={styles.categoryHeader}>
                <View style={[
                  styles.categoryHeaderIcon,
                  { backgroundColor: category.color + '20' }
                ]}>
                  <MaterialIcons
                    name={category.icon as any}
                    size={20}
                    color={category.color}
                  />
                </View>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                  ({categoryProducts.length})
                </Text>
              </View>
              {categoryProducts.map(renderProduct)}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    marginLeft: spacing.sm,
    paddingVertical: 4,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  categoryChipText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  categoryGroup: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  categoryTitle: {
    ...typography.h4,
  },
  categoryCount: {
    ...typography.bodySmall,
    marginLeft: spacing.xs,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    ...typography.body,
    fontWeight: '500',
  },
  productMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    ...typography.body,
    fontWeight: '600',
  },
  changeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  changeText: {
    ...typography.caption,
    fontWeight: '600',
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  emptyButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
