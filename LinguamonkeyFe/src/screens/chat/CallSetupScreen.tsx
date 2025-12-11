import React, { useRef, useState, useEffect, useCallback } from "react"
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Platform } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import CountryFlag from "react-native-country-flag"
import { Client } from '@stomp/stompjs'; // IMPORT STOMP
import { TextEncoder, TextDecoder } from 'text-encoding'; // IMPORT POLYFILL

import { useAppStore, CallPreferences } from "../../stores/appStore"
import { useUserStore } from "../../stores/UserStore"
import { useChatStore } from "../../stores/ChatStore"
import { useUsers } from "../../hooks/useUsers"
import { useVideoCalls, MatchResponseData } from "../../hooks/useVideos"
import { useTokenStore } from "../../stores/tokenStore" // IMPORT TOKEN STORE
import ScreenLayout from "../../components/layout/ScreenLayout"
import { AgeRange, ProficiencyLevel, LearningPace, Gender } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"
import { RoomResponse, CallPreferencesRequest, LanguageResponse } from "../../types/dto"
import { languageToCountry } from "../../types/api"
import { API_BASE_URL } from "../../api/apiConfig" // IMPORT API_BASE_URL

// --- 1. POLYFILL CHO REACT NATIVE ---
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

const ICON_MAP: Record<string, string> = {
  plane: "flight",
  music: "music-note",
  film: "movie",
  cutlery: "restaurant",
}

const getMaterialIconName = (iconName: string | undefined) => {
  if (!iconName) return "star"
  return ICON_MAP[iconName] || iconName
}

interface MatchHookResponse {
  code: number;
  message: string;
  data?: MatchResponseData;
}

interface FinalCallPreferences extends Omit<CallPreferences, 'learningLanguage'> {
  nativeLanguage: string;
  learningLanguages: string[];
  proficiency: string;
  learningPace: string;
  gender: string;
}

const CallSetupScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { accessToken } = useTokenStore() // Lấy AccessToken để auth socket
  const { callPreferences: savedPreferences, setCallPreferences, supportLanguage: rawSupportedLangs = [] } = useAppStore()
  const totalOnlineUsers = useChatStore(s => s.totalOnlineUsers)

  const supportedLanguages = rawSupportedLangs as unknown as LanguageResponse[]

  const { useInterests } = useUsers()
  const { useFindCallPartner, useCancelFindMatch } = useVideoCalls()
  const { mutate: findMatch } = useFindCallPartner()
  const { mutate: cancelMatch } = useCancelFindMatch()

  const [isSearching, setIsSearching] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [searchStatusMessage, setSearchStatusMessage] = useState(t("call.searchingTitle"))

  // --- REFS ---
  const stompClient = useRef<Client | null>(null); // Ref giữ socket connection
  const isMatchFoundRef = useRef(false); // Ref để tránh race condition (vừa API vừa Socket trả về)

  const defaultPreferences: FinalCallPreferences = {
    interests: [],
    gender: (user.gender as string) || "any",
    nativeLanguage: user?.nativeLanguageCode || "en",
    learningLanguages: user?.languages || ["vi"],
    ageRange: (user?.ageRange || AgeRange.AGE_18_24) as string,
    proficiency: (user?.proficiency || ProficiencyLevel.INTERMEDIATE) as string,
    learningPace: (user?.learningPace || LearningPace.NORMAL) as string,
  }

  const initialPreferences: FinalCallPreferences = {
    ...defaultPreferences,
    ...(savedPreferences ? {
      interests: savedPreferences.interests || defaultPreferences.interests,
      gender: savedPreferences.gender || defaultPreferences.gender,
      nativeLanguage: user?.nativeLanguageCode || defaultPreferences.nativeLanguage,
      learningLanguages: (savedPreferences as any).learningLanguages || defaultPreferences.learningLanguages,
      ageRange: savedPreferences.ageRange || defaultPreferences.ageRange,
      proficiency: (savedPreferences as any).proficiency || defaultPreferences.proficiency,
      learningPace: (savedPreferences as any).learningPace || defaultPreferences.learningPace,
    } : {})
  }

  const [preferences, setPreferences] = useState<FinalCallPreferences>(initialPreferences)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  // Bỏ pollingTimeout cũ, ta dùng nó cho timeout dự phòng thôi
  const fallbackTimeout = useRef<any>(null)

  const { data: interests = [], isLoading: isLoadingInterests } = useInterests()

  const getFlagIsoFromLang = (langCode?: string) => {
    if (!langCode) return undefined
    const lower = String(langCode).toLowerCase()
    const mapped = (languageToCountry as Record<string, string>)[lower]
    if (mapped) return mapped
    return langCode.slice(0, 2).toUpperCase()
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()

    // Clean up socket khi unmount màn hình
    return () => {
      disconnectSocket();
    }
  }, [])

  // --- 2. LOGIC SOCKET (MỚI) ---
  const connectSocket = useCallback(() => {
    if (!user?.userId || !accessToken) return;
    if (stompClient.current && stompClient.current.active) return;

    // Convert HTTP URL to WS URL
    let cleanBase = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = API_BASE_URL.includes('https') ? 'wss://' : 'ws://';
    // Backend Spring Boot Endpoint của bạn (thường là /ws hoặc /ws-endpoint)
    const brokerURL = `${protocol}${cleanBase}/ws`;

    console.log("🔌 Connecting Match Socket:", brokerURL);

    const client = new Client({
      brokerURL: brokerURL,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`, // Auth nếu backend cần
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("✅ Match Socket Connected!");

        // Subscribe vào Topic cá nhân: Backend gửi vào /topic/match-updates/{userId}
        client.subscribe(`/topic/match-updates/${user.userId}`, (message) => {
          if (isMatchFoundRef.current) return; // Đã tìm thấy rồi thì bỏ qua tin nhắn trùng

          try {
            const body = JSON.parse(message.body);
            console.log("⚡ SOCKET RECEIVED:", body);

            if (body.type === 'MATCH_FOUND' || body.status === 'MATCHED') {
              // Nhận được tin -> Vào phòng ngay lập tức
              handleMatchSuccess(body.room);
            }
          } catch (e) {
            console.error("Socket parse error", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
      },
    });

    client.activate();
    stompClient.current = client;
  }, [user?.userId, accessToken]);

  const disconnectSocket = useCallback(() => {
    if (stompClient.current) {
      stompClient.current.deactivate();
      stompClient.current = null;
    }
  }, []);


  // --- UI HANDLERS ---
  const toggleInterest = (interestId: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  const toggleLearningLanguage = (code: string) => {
    setPreferences((prev) => {
      const list = prev.learningLanguages
      const exists = list.includes(code)
      if (exists && list.length === 1) return prev
      return {
        ...prev,
        learningLanguages: exists ? list.filter(c => c !== code) : [...list, code]
      }
    })
  }

  const updatePreference = (key: keyof FinalCallPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const startSearchAnimations = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start()
  }, [])

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation()
    rotateAnim.stopAnimation()
  }, [])

  const handleMatchSuccess = useCallback((room: RoomResponse) => {
    if (isMatchFoundRef.current) return;
    isMatchFoundRef.current = true; // Lock lại để không bị gọi 2 lần (Socket + API)

    stopAnimations();
    setSearchStatusMessage(t("call.matchFound"));
    disconnectSocket(); // Ngắt socket tìm kiếm

    // Rung nhẹ hoặc âm thanh thông báo ở đây nếu cần

    setTimeout(() => {
      setIsSearching(false);
      navigation.navigate("WebRTCCall", { // Đổi tên thành WebRTCCall như file trước bạn gửi
        roomId: room.roomId,
        videoCallId: room.videoCallId || "", // Thêm field nếu backend có
        isCaller: false, // Logic vào cùng lúc thì vai trò không quan trọng lắm cho UI
        preferences: preferences
      })
    }, 500); // Delay nhỏ để user kịp nhìn thấy chữ "Match Found"
  }, [preferences, navigation, disconnectSocket])

  // --- 3. LOGIC TÌM KIẾM (HYBRID: REST + SOCKET) ---
  const performSearch = useCallback(() => {
    if (!user?.userId) {
      Alert.alert(t("common.error"), t("auth.loginRequired"))
      setIsSearching(false)
      stopAnimations()
      return
    }

    // 1. Kết nối socket trước khi gọi API để đảm bảo không miss event
    connectSocket();
    isMatchFoundRef.current = false;

    const requestPayload: CallPreferencesRequest = {
      interests: preferences.interests,
      gender: preferences.gender,
      nativeLanguage: preferences.nativeLanguage,
      learningLanguages: preferences.learningLanguages,
      ageRange: preferences.ageRange,
      proficiency: preferences.proficiency as ProficiencyLevel,
      learningPace: preferences.learningPace as LearningPace,
      userId: user.userId,
    }

    // 2. Gọi API để join queue
    findMatch(
      requestPayload,
      {
        onSuccess: (response: MatchHookResponse) => {
          if (!isSearching) return; // User đã cancel lúc đang gọi API

          const result = response.data;

          // CASE A: API trả về MATCHED ngay lập tức (Bạn là người ghép đôi cuối cùng)
          if (result && result.status === 'MATCHED' && result.room) {
            console.log("🎯 Match found via REST API (Instant)");
            handleMatchSuccess(result.room);
          }

          // CASE B: API trả về WAITING (202) -> Ngồi chơi xơi nước chờ Socket báo
          else {
            console.log("⏳ Waiting in queue... Listening to Socket.");
            // KHÔNG GỌI setInterval/setTimeout để polling nữa!
            // Socket sẽ lo phần còn lại.
          }
        },
        onError: (error) => {
          console.error("Match API error:", error)
          // Xử lý lỗi, ví dụ retry nhẹ hoặc báo lỗi
          if (isSearching) {
            // Fallback: Nếu socket chết, thử gọi lại API sau 10s (Long polling safe guard)
            fallbackTimeout.current = setTimeout(performSearch, 10000);
          }
        }
      }
    )
  }, [isSearching, preferences, findMatch, handleMatchSuccess, user, connectSocket])

  const handleStartSearch = () => {
    if (preferences.interests.length === 0) {
      Alert.alert(t("call.selectInterests"), t("call.selectInterestsMessage"))
      return
    }
    setCallPreferences(preferences as any)
    setIsSearching(true)
    setStartTime(Date.now())
    setSearchStatusMessage(t("call.searchingTitle"))
    startSearchAnimations()
    // Trigger search effect
  }

  const handleCancelSearch = () => {
    if (fallbackTimeout.current) clearTimeout(fallbackTimeout.current)

    if (user?.userId) {
      cancelMatch({ userId: user.userId } as any)
    }

    disconnectSocket(); // Ngắt socket ngay
    stopAnimations()
    setIsSearching(false)
    setElapsedSeconds(0)
    isMatchFoundRef.current = false;
  }

  // Effect để trigger search khi state isSearching = true
  useEffect(() => {
    if (isSearching) {
      performSearch();

      const timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

      return () => {
        clearInterval(timer);
        if (fallbackTimeout.current) clearTimeout(fallbackTimeout.current);
      }
    }
  }, [isSearching]) // Bỏ startTime khỏi dependency để tránh re-run

  // ... (Phần render UI giữ nguyên như cũ) ...
  // ... Paste phần renderOptions, renderLearningLanguageChips và return JSX cũ vào đây ...

  const renderOptionButton = (options: any[], selectedValue: any, onSelect: (val: any) => void) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.optionButton, selectedValue === option.value && styles.selectedOptionButton]}
          onPress={() => onSelect(option.value)}
        >
          {option.icon && (
            <Icon name={getMaterialIconName(option.icon)} size={18} color={selectedValue === option.value ? "#FFFFFF" : "#6B7280"} />
          )}
          <Text style={[styles.optionButtonText, selectedValue === option.value && styles.selectedOptionButtonText]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderLearningLanguageChips = () => {
    const FIXED_LANGUAGES = [
      { languageCode: 'vi', languageName: t('language.vietnamese') || 'Vietnamese' },
      { languageCode: 'en', languageName: t('language.english') || 'English' },
      { languageCode: 'zh', languageName: t('language.chinese') || 'Chinese' },
    ]

    const displayLangs = FIXED_LANGUAGES.map(lang => ({
      ...lang,
      languageCode: String(lang.languageCode).toLowerCase()
    }))

    return (
      <View style={styles.languagesGrid}>
        {displayLangs.map((lang) => {
          const isSelected = preferences.learningLanguages.includes(lang.languageCode)
          const iso = getFlagIsoFromLang(lang.languageCode)

          return (
            <TouchableOpacity
              key={lang.languageCode}
              style={[styles.languageOption, isSelected && styles.selectedLanguageOption]}
              onPress={() => toggleLearningLanguage(lang.languageCode)}
            >
              {iso ? (
                <CountryFlag isoCode={iso} size={16} />
              ) : (
                <View style={{ width: 16, height: 16 }} />
              )}
              <Text style={[styles.languageText, isSelected && styles.selectedLanguageText]}>
                {lang.languageName}
              </Text>
              {isSelected && <Icon name="check" size={14} color="#4F46E5" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  const genderOptions = [
    { value: "any", label: t("call.genderAny"), icon: "people" },
    { value: "male", label: t("call.genderMale"), icon: "man" },
    { value: "female", label: t("call.genderFemale"), icon: "woman" },
  ]
  const ageRanges = Object.values(AgeRange).map(v => ({ value: v, label: t(`call.age.${v}`) }))
  const proficiencyOptions = Object.values(ProficiencyLevel).map(v => ({ value: v, label: t(`enums.proficiency.${v}`) }))
  const paceOptions = Object.values(LearningPace).map(v => ({ value: v, label: t(`enums.pace.${v}`) }))

  if (isSearching) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="radar" size={28} color="#4F46E5" />
            <Text style={styles.logoText}>{t("call.findingPartner")}</Text>
          </View>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.messageTitle}>{searchStatusMessage}</Text>
          <Animated.View style={[
            styles.radarContainer,
            { transform: [{ scale: pulseAnim }, { rotate: spin }] }
          ]}>
            <Icon name="search" size={100} color="#4F46E5" />
          </Animated.View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {totalOnlineUsers > 0 ? totalOnlineUsers.toLocaleString() : 1}
              </Text>
              <Text style={styles.statLabel}>{t("call.onlineUsers")}</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>{t("call.elapsedTime")}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}>
            <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="language" size={32} color="#4F46E5" />
          <Text style={styles.logoText}>MonkeyLingua</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.pageTitle}>{t("call.setupTitle")}</Text>
          <Text style={styles.pageSubtitle}>{t("call.setupDescription")}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("call.partnerNativeLanguage")} <Text style={styles.subLabel}>(What you want to learn)</Text>
            </Text>
            {renderLearningLanguageChips()}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.commonInterests")}</Text>
            {isLoadingInterests ? <ActivityIndicator /> : (
              <View style={styles.interestsGrid}>
                {interests.map((interest) => {
                  const isSelected = preferences.interests.includes(interest.interestId)
                  const iconName = getMaterialIconName(interest.icon)
                  const color = interest.color || "#6B7280"
                  return (
                    <TouchableOpacity
                      key={interest.interestId}
                      style={[styles.interestItem, isSelected && { backgroundColor: `${color}20`, borderColor: color }]}
                      onPress={() => toggleInterest(interest.interestId)}
                    >
                      <Icon name={iconName} size={20} color={isSelected ? color : "#6B7280"} />
                      <Text style={[styles.interestText, isSelected && { color: color, fontWeight: "600" }]}>
                        {interest.interestName}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("user.proficiency")}</Text>
            {renderOptionButton(proficiencyOptions, preferences.proficiency, (v) => updatePreference('proficiency', v))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("user.learningPace")}</Text>
            {renderOptionButton(paceOptions, preferences.learningPace, (v) => updatePreference('learningPace', v))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerGender")}</Text>
            {renderOptionButton(genderOptions, preferences.gender, (v) => updatePreference("gender", v))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.ageRange")}</Text>
            <View style={styles.optionsContainer}>
              {ageRanges.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionButton, styles.optionButtonSmall, preferences.ageRange === option.value && styles.selectedOptionButton]}
                  onPress={() => updatePreference("ageRange", option.value)}
                >
                  <Text style={[styles.optionButtonText, preferences.ageRange === option.value && styles.selectedOptionButtonText]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startButton, preferences.interests.length === 0 && styles.startButtonDisabled]}
            onPress={handleStartSearch}
            disabled={preferences.interests.length === 0}
          >
            <Icon name="search" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>{t("call.startSearch")}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 20, fontWeight: "800", color: "#4F46E5", letterSpacing: -0.5 },
  closeButton: { padding: 4 },
  content: { flex: 1 },
  scrollContent: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: "bold", color: "#1F2937", marginBottom: 8 },
  pageSubtitle: { fontSize: 16, color: "#6B7280", marginBottom: 24, lineHeight: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  subLabel: { fontWeight: '400', fontSize: 14, color: '#666' },
  languagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  languageOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 6 },
  selectedLanguageOption: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  languageText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  selectedLanguageText: { color: "#4F46E5", fontWeight: "700" },
  interestsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  interestItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 8 },
  interestText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  optionsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", gap: 8 },
  optionButtonSmall: { paddingHorizontal: 14, paddingVertical: 8 },
  selectedOptionButton: { borderColor: "#4F46E5", backgroundColor: "#4F46E5" },
  optionButtonText: { fontSize: 14, color: "#374151", fontWeight: "600" },
  selectedOptionButtonText: { color: "#FFFFFF" },
  startButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", paddingVertical: 18, borderRadius: 16, gap: 10, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, marginTop: 16 },
  startButtonDisabled: { backgroundColor: "#9CA3AF", shadowOpacity: 0.1 },
  startButtonText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  messageTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937", textAlign: "center", marginBottom: 40 },
  radarContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  statsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statItem: { alignItems: 'center', minWidth: 80 },
  statSeparator: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 20 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#4F46E5' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  cancelButton: { marginTop: 40, padding: 16 },
  cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
})

export default CallSetupScreen