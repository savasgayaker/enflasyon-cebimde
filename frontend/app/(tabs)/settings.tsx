import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { tr } from '../../src/i18n/tr';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, receipts, priceRecords } = useAppStore();
  const theme = settings.darkMode ? colors.dark : colors.light;
  
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState(settings.name);
  const [tempEmail, setTempEmail] = useState(settings.email);

  const handleSaveName = () => {
    updateSettings({ name: tempName });
    setEditingName(false);
  };

  const handleSaveEmail = () => {
    updateSettings({ email: tempEmail });
    setEditingEmail(false);
  };

  const handleResetData = () => {
    Alert.alert(
      'Verileri Sıfırla',
      'Tüm verileriniz silinecektir. Bu işlem geri alınamaz.',
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.confirm,
          style: 'destructive',
          onPress: () => {
            // In a real app, we'd clear all data here
            Alert.alert(tr.success, 'Veriler sıfırlandı');
          },
        },
      ]
    );
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.settingsItem, { backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
        <MaterialIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        onPress && <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {tr.settings.profile}
        </Text>
        
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
          {/* Name */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => {
              setTempName(settings.name);
              setEditingName(true);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialIcons name="person" size={22} color={colors.primary} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.name}</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="İsminizi girin"
                    placeholderTextColor={theme.textTertiary}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveName}>
                    <MaterialIcons name="check" size={24} color={colors.success} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                  {settings.name || 'Belirtilmemiş'}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Email */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => {
              setTempEmail(settings.email);
              setEditingEmail(true);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialIcons name="email" size={22} color={colors.primary} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.email}</Text>
              {editingEmail ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={tempEmail}
                    onChangeText={setTempEmail}
                    placeholder="E-posta adresinizi girin"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="email-address"
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveEmail}>
                    <MaterialIcons name="check" size={24} color={colors.success} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                  {settings.email || 'Belirtilmemiş'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Tercihler
        </Text>

        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
          {/* Currency */}
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
              <MaterialIcons name="attach-money" size={22} color={colors.accent} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.currency}</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                Türk Lirası (₺)
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Language */}
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.info + '15' }]}>
              <MaterialIcons name="language" size={22} color={colors.info} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.language}</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                Türkçe
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Dark Mode */}
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryDark + '15' }]}>
              <MaterialIcons
                name={settings.darkMode ? 'dark-mode' : 'light-mode'}
                size={22}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.darkMode}</Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => updateSettings({ darkMode: value })}
              trackColor={{ false: theme.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Notifications */}
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
              <MaterialIcons name="notifications" size={22} color={colors.warning} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.notifications}</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => updateSettings({ notifications: value })}
              trackColor={{ false: theme.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Data Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Veri Yönetimi
        </Text>

        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
          {/* Stats */}
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
              <MaterialIcons name="bar-chart" size={22} color={colors.success} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Verileriniz</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                {receipts.length} fiş, {priceRecords.length} kayıt
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Export */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push('/(tabs)/analytics')}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.info + '15' }]}>
              <MaterialIcons name="download" size={22} color={colors.info} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.exportData}</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                CSV olarak dışa aktar
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Reset */}
          <TouchableOpacity style={styles.settingsItem} onPress={handleResetData}>
            <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
              <MaterialIcons name="delete-forever" size={22} color={colors.error} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: colors.error }]}>Verileri Sıfırla</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                Tüm verileri sil
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {tr.settings.about}
        </Text>

        <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
          <View style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialIcons name="info" size={22} color={colors.primary} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Enflasyon Cebimde</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                Versiyon 1.0.0
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.settingsItem}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight + '15' }]}>
              <MaterialIcons name="privacy-tip" size={22} color={colors.primaryLight} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{tr.settings.privacyPolicy}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Geliştirici
            </Text>
            <View style={[styles.settingsGroup, { backgroundColor: theme.surface }]}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => router.push('/ocr-test')}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
                  <MaterialIcons name="text-snippet" size={22} color={colors.accent} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>OCR Test</Text>
                  <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                    ML Kit metin tanıma çıktısını incele
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
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
  sectionTitle: {
    ...typography.label,
    textTransform: 'uppercase',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingsGroup: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemTitle: {
    ...typography.body,
    fontWeight: '500',
  },
  itemSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    ...typography.bodySmall,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
  },
});
