import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'toggle' | 'action';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const ChatSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { chatSettings, setChatSettings, resetChatSettings } = useAppStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    setChatSettings({ [key]: value });
  };

  const clearTranslationHistory = () => {
    Alert.alert(
      t('chat.clearHistoryConfirmTitle'),
      t('chat.clearHistoryConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const translationSettings: SettingItem[] = [
    {
      id: 'auto-translate',
      title: t('chat.autoTranslate'),
      description: t('chat.autoTranslateDesc'),
      icon: 'translate',
      type: 'toggle',
      value: chatSettings.autoTranslate,
      onToggle: (value) => updateSetting('autoTranslate', value),
    },
    {
      id: 'show-original',
      title: t('chat.showOriginal'),
      description: t('chat.showOriginalDesc'),
      icon: 'visibility',
      type: 'toggle',
      value: chatSettings.showOriginalButton,
      onToggle: (value) => updateSetting('showOriginalButton', value),
    },
    {
      id: 'translate-vietnamese',
      title: t('chat.translateVietnamese'),
      description: t('chat.translateVietnameseDesc'),
      icon: 'language',
      type: 'toggle',
      value: chatSettings.translateToVietnamese,
      onToggle: (value) => updateSetting('translateToVietnamese', value),
    },
    {
      id: 'save-history',
      title: t('chat.saveHistory'),
      description: t('chat.saveHistoryDesc'),
      icon: 'history',
      type: 'toggle',
      value: chatSettings.saveTranslationHistory,
      onToggle: (value) => updateSetting('saveTranslationHistory', value),
    },
    {
      id: 'offline-translation',
      title: t('chat.offlineTranslation'),
      description: t('chat.offlineTranslationDesc'),
      icon: 'cloud-off',
      type: 'toggle',
      value: chatSettings.offlineTranslation,
      onToggle: (value) => updateSetting('offlineTranslation', value),
    },
  ];

  const chatSettingsItems: SettingItem[] = [
    {
      id: 'sound-notifications',
      title: t('chat.soundNotifications'),
      description: t('chat.soundNotificationsDesc'),
      icon: 'volume-up',
      type: 'toggle',
      value: chatSettings.soundNotifications,
      onToggle: (value) => updateSetting('soundNotifications', value),
    },
    {
      id: 'vibration',
      title: t('chat.vibrationNotifications'),
      description: t('chat.vibrationNotificationsDesc'),
      icon: 'vibration',
      type: 'toggle',
      value: chatSettings.vibrationNotifications,
      onToggle: (value) => updateSetting('vibrationNotifications', value),
    },
    {
      id: 'typing-indicator',
      title: t('chat.typingIndicator'),
      description: t('chat.typingIndicatorDesc'),
      icon: 'edit',
      type: 'toggle',
      value: chatSettings.showTypingIndicator,
      onToggle: (value) => updateSetting('showTypingIndicator', value),
    },
    {
      id: 'auto-correct',
      title: t('chat Godot::TimedAnimation'),
      description: t('chat.autoCorrectDesc'),
      icon: 'spellcheck',
      type: 'toggle',
      value: chatSettings.autoCorrect,
      onToggle: (value) => updateSetting('autoCorrect', value),
    },
    {
      id: 'word-suggestions',
      title: t('chat.wordSuggestions'),
      description: t('chat.wordSuggestionsDesc'),
      icon: 'lightbulb',
      type: 'toggle',
      value: chatSettings.wordSuggestions,
      onToggle: (value) => updateSetting('wordSuggestions', value),
    },
  ];

  const actionSettings: SettingItem[] = [
    {
      id: 'clear-history',
      title: t('chat.clearHistory'),
      description: t('chat.clearHistoryDesc'),
      icon: 'delete-sweep',
      type: 'action',
      onPress: clearTranslationHistory,
    },
    {
      id: 'reset-settings',
      title: t('chat.resetSettings'),
      description: t('chat.resetSettingsDesc'),
      icon: 'restore',
      type: 'action',
      onPress: resetChatSettings,
    },
  ];

  const renderSettingItem = (item: SettingItem, isDangerous = false) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={[styles.settingIcon, isDangerous && styles.dangerousIcon]}>
        <Icon
          name={item.icon}
          size={20}
          color={isDangerous ? '#EF4444' : '#4F46E5'}
        />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDangerous && styles.dangerousText]}>
          {item.title}
        </Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, subtitle: string, items: SettingItem[], isDangerous = false) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionContent}>
        {items.map(item => renderSettingItem(item, isDangerous))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('chat.settingsTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Translation Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="translate" size={24} color="#4F46E5" />
              <Text style={styles.infoTitle}>{t('chat.translationInfoTitle')}</Text>
            </View>
            <Text style={styles.infoText}>
              {t('chat.translationInfoDesc')}
            </Text>
          </View>

          {renderSection(
            t('chat.translationSection'),
            t('chat.translationSubtitle'),
            translationSettings
          )}

          {renderSection(
            t('chat.chatSection'),
            t('chat.chatSubtitle'),
            chatSettingsItems
          )}

          {renderSection(
            t('chat.actionSection'),
            t('chat.actionSubtitle'),
            actionSettings,
            true
          )}

          {/* Translation Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('chat.supportedLanguages')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('chat.supportedLanguagesDesc')}
            </Text>
            <View style={styles.languageGrid}>
              {[
                { code: 'vi', name: t('call.languages.vi'), flag: '🇻🇳' },
                { code: 'en', name: t('call.languages.en'), flag: '🇺🇸' },
                { code: 'zh', name: t('call.languages.zh'), flag: '🇨🇳' },
                { code: 'ja', name: t('call.languages.ja'), flag: '🇯🇵' },
                { code: 'ko', name: t('call.languages.ko'), flag: '🇰🇷' },
                { code: 'fr', name: t('call.languages.fr'), flag: '🇫🇷' },
                { code: 'es', name: t('call.languages.es'), flag: '🇪🇸' },
                { code: 'de', name: t('call.languages.de'), flag: '🇩🇪' },
              ].map((lang) => (
                <View key={lang.code} style={styles.languageItem}>
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={styles.languageName}>{lang.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="tips-and-updates" size={20} color="#F59E0B" />
              <Text style={styles.tipsTitle}>{t('chat.tipsTitle')}</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('chat.tip1')}
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('chat.tip2')}
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>
                  {t('chat.tip3')}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerousIcon: {
    backgroundColor: '#FEF2F2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dangerousText: {
    color: '#EF4444',
  },
  languageGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});

export default ChatSettingsScreen;