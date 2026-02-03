/**
 * Settings Screen
 * Story 1.10: Suppression de Compte
 *
 * Main settings screen for account management.
 * Currently implements:
 * - Delete account functionality (Story 1.10)
 *
 * Future stories will add:
 * - Email modification (Story 4.5)
 * - Password modification (Story 4.6)
 * - Privacy policy (Story 4.7)
 * - CGU/Terms (Story 4.8)
 * - Contact support (Story 4.9)
 */

import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StatusBar } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '@/features/auth';
import { DeleteAccountModal } from '@/features/settings';

/**
 * Settings list item component
 */
interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}

const SettingsItem = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  danger = false,
  testID,
}: SettingsItemProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      className={`flex-row items-center px-4 py-4 min-h-[56px] ${
        danger ? 'active:bg-red-50 dark:active:bg-red-900/20' : 'active:bg-gray-50 dark:active:bg-gray-800'
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      testID={testID}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
        }`}
      >
        <Ionicons
          name={icon}
          size={22}
          color={iconColor || (danger ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280')}
        />
      </View>
      <View className="flex-1 ml-3">
        <Text
          className={`text-base font-medium ${
            danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
          }`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
    </Pressable>
  );
};

/**
 * Section header component
 */
const SectionHeader = ({ title }: { title: string }) => (
  <View className="px-4 pt-6 pb-2">
    <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
      {title}
    </Text>
  </View>
);

/**
 * Settings Screen Component
 */
export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  // Delete account modal state
  const [isDeleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

  /**
   * Handle delete account button press (AC#1)
   */
  const handleDeleteAccountPress = () => {
    setDeleteAccountModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" testID="settings-screen">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#FFFFFF'}
      />

      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez votre compte et vos préférences
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <SectionHeader title="Compte" />
        <View className="bg-white dark:bg-gray-900 border-t border-b border-gray-200 dark:border-gray-800">
          {/* User email display */}
          {user?.email && (
            <View className="flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                <Ionicons name="person-outline" size={22} color="#3B82F6" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Connecté en tant que</Text>
                <Text className="text-base font-medium text-gray-900 dark:text-white">{user.email}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Danger Zone Section */}
        <SectionHeader title="Zone de danger" />
        <View className="bg-white dark:bg-gray-900 border-t border-b border-gray-200 dark:border-gray-800">
          <SettingsItem
            icon="trash-outline"
            title="Supprimer mon compte"
            subtitle="Supprime définitivement votre compte et toutes vos données"
            onPress={handleDeleteAccountPress}
            danger
            testID="delete-account-button"
          />
        </View>

        {/* Spacer */}
        <View className="h-8" />

        {/* App info */}
        <View className="items-center py-6">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            Dressing Intelligent v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={isDeleteAccountModalVisible}
        userEmail={user?.email || ''}
        onClose={() => setDeleteAccountModalVisible(false)}
      />
    </SafeAreaView>
  );
}
