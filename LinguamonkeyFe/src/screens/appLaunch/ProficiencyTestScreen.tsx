import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  FlatList, Image, Alert,
  RefreshControl
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  useAvailableTests,
  useStartTest,
  useTestHistory,
  EXTERNAL_RESOURCES,
  ExternalTestConfig
} from "../../hooks/useTesting";
import { useUserStore } from "../../stores/UserStore";
import { languageToCountry } from "../../types/api";
import CountryFlag from "react-native-country-flag";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import VipUpgradeModal from "../../components/modals/VipUpgradeModal";
import { TestConfigResponse } from "../../types/dto";
import { getTestThumbnail } from "../../utils/imageUtil";

type Tab = "available" | "history";

const ProficiencyTestScreen = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { mode?: 'placement' | 'certification' | 'skill'; } | undefined;
  const mode = params?.mode || 'placement';

  const vip = useUserStore(s => s.vip);
  const targetLanguages = useUserStore(s => s.user?.languages ?? []);

  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [page, setPage] = useState(0);
  const [testsList, setTestsList] = useState<TestConfigResponse[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [showVipModal, setShowVipModal] = useState(false);

  const allLanguages: Record<string, { name: string, iso: string }> = {
    'en': { name: 'English', iso: 'US' },
    'vi': { name: 'Tiếng Việt', iso: 'VN' },
    'zh': { name: '中文', iso: 'CN' },
  };
  const countryMap: Record<string, string> = languageToCountry as Record<string, string>;

  const userTargetLanguages = useMemo(() => {
    return targetLanguages
      .map(code => ({
        code: code,
        name: allLanguages[code]?.name ?? code.toUpperCase(),
        iso: allLanguages[code]?.iso ?? countryMap[code] ?? code.toUpperCase().slice(0, 2)
      }))
      .filter(lang => lang.name);
  }, [targetLanguages]);

  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string | null>(null);

  useEffect(() => {
    if (userTargetLanguages.length > 0 && !selectedLanguageCode) {
      setSelectedLanguageCode(userTargetLanguages[0].code);
    }
  }, [userTargetLanguages]);

  // Hooks
  const { data: testsPageData, isLoading: isLoadingTests, isFetching: isFetchingTests } = useAvailableTests({
    languageCode: selectedLanguageCode,
    page: page,
    size: 10,
  });

  const { data: historyList = [], isLoading: loadingHistory, refetch: refetchHistory } = useTestHistory();
  const { mutateAsync: startTestMutate, isPending: isStarting } = useStartTest();

  // Pagination Effect
  useEffect(() => {
    if (testsPageData) {
      if (page === 0) setTestsList(testsPageData.content);
      else setTestsList(prev => [...prev, ...testsPageData.content]);
      setHasMore(!testsPageData.isLast);
    }
  }, [testsPageData, page]);

  useEffect(() => {
    setPage(0);
    setTestsList([]);
    setHasMore(true);
  }, [selectedLanguageCode]);

  useEffect(() => {
    if (activeTab === 'history') refetchHistory();
  }, [activeTab]);

  const handleLoadMore = () => {
    if (hasMore && !isFetchingTests) setPage(prev => prev + 1);
  };

  const handleOpenWebView = (external: ExternalTestConfig) => {
    (navigation as any).navigate('WebViewScreen', {
      url: external.url,
      title: external.title,
    });
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  const handleSelectTest = async (testConfig: TestConfigResponse) => {
    if (mode !== 'placement' && !vip) {
      setShowVipModal(true);
      return;
    }
    try {
      const response = await startTestMutate(testConfig.testConfigId);

      if (response && response.questions) {
        (navigation as any).navigate('TestSessionScreen', {
          sessionId: response.sessionId,
          questions: response.questions,
          durationSeconds: testConfig.durationSeconds || 2700,
          title: testConfig.title,
          testConfigId: testConfig.testConfigId
        });
      }
    } catch (e: any) {
      Alert.alert(t("error.title"), e.message);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <Text style={styles.title}>{t("proficiencyTest.title", "Skill Assessment")}</Text>
        <TouchableOpacity onPress={handleGoHome} style={styles.homeButton}>
          <Icon name="home" size={26} color="#4F46E5" />
        </TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => setActiveTab('available')}>
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>{t("test.available", "Tests")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>{t("test.history", "History")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailableTab = () => (
    <>
      <View style={styles.langContainer}>
        <Text style={styles.sectionTitle}>1. Select Target Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
          {userTargetLanguages.map(lang => (
            <TouchableOpacity key={lang.code} style={[styles.langChip, selectedLanguageCode === lang.code && styles.langChipSelected]} onPress={() => setSelectedLanguageCode(lang.code)}>
              <CountryFlag isoCode={lang.iso} size={16} style={styles.flag} />
              <Text style={[styles.langText, selectedLanguageCode === lang.code && styles.langTextSelected]}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.externalContainer}>
        <Text style={styles.sectionTitle}>2. External Practice</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.externalScroll}>
          {EXTERNAL_RESOURCES.map(item => (
            <TouchableOpacity key={item.id} style={styles.externalCard} onPress={() => handleOpenWebView(item)}>
              <View style={[styles.externalIcon, { backgroundColor: item.color }]}><Icon name={item.iconName} size={24} color="#FFF" /></View>
              <Text style={styles.externalTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.sectionTitle}>3. Official Tests</Text>
      {isLoadingTests && page === 0 ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={testsList}
          keyExtractor={item => item.testConfigId}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.testCard} onPress={() => handleSelectTest(item)} disabled={isStarting}>
              <Image source={getTestThumbnail(item)} style={styles.testImage} resizeMode="cover" />
              <View style={styles.testContent}>
                <Text style={styles.testTitle}>{item.title}</Text>
                <Text style={styles.testDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.testMeta}>
                  <Icon name="timer" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{Math.floor((item.durationSeconds || 2700) / 60)} min</Text>
                  <View style={styles.divider} />
                  <Icon name="help-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{item.numQuestions} Qs</Text>
                </View>
              </View>
              {isStarting && <ActivityIndicator style={{ marginRight: 10 }} color="#4F46E5" />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No tests available.</Text>}
        />
      )}
    </>
  );

  return (
    <ScreenLayout style={styles.container}>
      {renderHeader()}
      {activeTab === 'history' ? (
        <FlatList
          data={historyList}
          refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={refetchHistory} />}
          keyExtractor={item => item.sessionId}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyCard} onPress={() => (navigation as any).navigate('TestResultScreen', { result: item })}>
              <View style={styles.historyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.status === 'REVIEW_PENDING' || item.status === 'GRADING' ? (
                    <Icon name="schedule" size={16} color="#F59E0B" />
                  ) : (
                    <Icon name="check-circle" size={16} color="#059669" />
                  )}
                  <Text style={[styles.statusBadge, item.status === 'FINISHED' ? styles.statusSuccess : styles.statusPending]}>
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.historyScore}>
                {item.status === 'FINISHED' ? `${item.proficiencyEstimate} (${item.score}/${item.totalQuestions})` : 'Waiting for results...'}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No history available.</Text>}
        />
      ) : renderAvailableTab()}
      <VipUpgradeModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  headerContainer: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  homeButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#4F46E5' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginLeft: 16, marginTop: 16, marginBottom: 8 },
  langContainer: { marginBottom: 8 },
  langScroll: { paddingHorizontal: 16 },
  langChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  langChipSelected: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  flag: { marginRight: 8, borderRadius: 2 },
  langText: { fontSize: 14, color: '#374151' },
  langTextSelected: { color: '#4F46E5', fontWeight: '600' },
  externalContainer: { marginBottom: 16 },
  externalScroll: { paddingHorizontal: 16 },
  externalCard: { width: 140, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  externalIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  externalTitle: { fontWeight: '700', fontSize: 14, color: '#111827', marginBottom: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  testCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  testImage: { width: 80, height: '100%', backgroundColor: '#E5E7EB' },
  testContent: { flex: 1, padding: 12 },
  testTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  testDesc: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  testMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  divider: { width: 1, height: 10, backgroundColor: '#D1D5DB', marginHorizontal: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
  historyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 10, elevation: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  statusSuccess: { color: '#065F46' },
  statusPending: { color: '#D97706' },
  historyDate: { color: '#6B7280', fontSize: 12 },
  historyScore: { fontSize: 16, fontWeight: '600', color: '#111827' },
});

export default ProficiencyTestScreen;