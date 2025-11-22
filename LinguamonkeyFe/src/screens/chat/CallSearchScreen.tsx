import Icon from 'react-native-vector-icons/MaterialIcons'
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, Text, TouchableOpacity, View } from "react-native"
import { useTranslation } from "react-i18next"
import { createScaledSheet } from '../../utils/scaledStyles'
import { useUserStore } from '../../stores/UserStore'
import ScreenLayout from '../../components/layout/ScreenLayout'
import { useVideoCalls } from '../../hooks/useVideos'
import { FindMatchResponse } from '../../types/dto'
import { useAppStore, CallPreferences } from '../../stores/appStore'


const languageFlags: { [key: string]: string } = {
  china: "🇨🇳",
  tonga: "🇹🇴",
  vietnam: "🇻🇳",
  korea: "🇰🇷",
  japan: "🇯🇵",
  united_states: "🇺🇸",
  france: "🇫🇷",
  germany: "🇩🇪",
  iceland: "🇮🇸",
  italy: "🇮🇹",
  spain: "🇪🇸",
  south_korea: "🇰🇷",
  india: "🇮🇳",
}

const CallSearchScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { preferences } = route.params as { preferences: CallPreferences }
  const { t } = useTranslation()
  const { useFindCallPartner } = useVideoCalls()

  const [searchTime, setSearchTime] = useState(0)
  const [estimatedTime] = useState(60)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  const {
    mutate: findMatch,
    data: matchData,
    isPending: isSearching,
    isSuccess: isFound,
    isError: isFailed,
  } = useFindCallPartner()

  const pulseAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]),
  )
  const rotateAnimation = Animated.loop(
    Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
  )

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    pulseAnimation.start()
    rotateAnimation.start()

    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1)
    }, 1000)

    findMatch({
      interests: preferences.interests,
      gender: preferences.gender,
      nativeLanguage: preferences.nativeLanguage,
      learningLanguage: preferences.learningLanguage,
      ageRange: preferences.ageRange,
      callDuration: preferences.callDuration,
    })

    return () => {
      clearInterval(timer)
      pulseAnimation.stop()
      rotateAnimation.stop()
    }
  }, [fadeAnim, findMatch, preferences, pulseAnimation, rotateAnimation])

  useEffect(() => {
    if (isFound && matchData) {
      pulseAnimation.stop()
      rotateAnimation.stop()
      setTimeout(() => {
        startCall(matchData)
      }, 2000)
    }
    if (isFailed) {
      pulseAnimation.stop()
      rotateAnimation.stop()
      Alert.alert(t("call.searchFailed"), t("call.searchFailedMessage"))
    }
  }, [isFound, isFailed, matchData, pulseAnimation, rotateAnimation, t])

  const cancelSearch = () => {
    Alert.alert(t("call.cancelSearch"), t("call.cancelSearchMessage"), [
      { text: t("call.continueSearch"), style: "cancel" },
      {
        text: t("common.cancel"),
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ])
  }

  const startCall = (data: FindMatchResponse) => {
    navigation.replace("JitsiCall", {
      roomId: data.roomId,
      partner: data.partner,
      videoCallId: data.videoCallId,
      preferences,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getSearchStatusText = () => {
    if (isSearching) return t("call.searching")
    if (isFound) return t("call.found")
    if (isFailed) return t("call.failed")
    return t("call.connecting")
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  if (isFound && matchData?.partner) {
    const foundPartner = matchData.partner
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("call.partnerFound")}</Text>
          <View style={styles.placeholder} />
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.foundSection}>
            <Text style={styles.foundTitle}>{t("call.found")}</Text>
            <Text style={styles.foundSubtitle}>{t("call.searchTime")}: {formatTime(searchTime)}</Text>

            <View style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <Text style={styles.partnerAvatar}>
                  {foundPartner.avatarUrl ? '🖼️' : '👤'}
                </Text>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{foundPartner.fullname || t("common.anonymousUser")}</Text>
                  <View style={styles.partnerLocation}>
                    <Text style={styles.partnerFlag}>{languageFlags[foundPartner.country.toLowerCase()] || '🌐'}</Text>
                    <Text style={styles.partnerCountry}>{foundPartner.country}</Text>
                  </View>
                </View>
                <View style={styles.partnerRating}>
                  <Icon name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{foundPartner.rating.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.partnerDetails}>
                <View style={styles.languageInfo}>
                  <View style={styles.languageItem}>
                    <Icon name="record-voice-over" size={16} color="#10B981" />
                    <Text style={styles.languageLabel}>{t("call.native")}:</Text>
                    <Text style={styles.languageValue}>{foundPartner.nativeLanguage}</Text>
                  </View>
                  <View style={styles.languageItem}>
                    <Icon name="school" size={16} color="#4F46E5" />
                    <Text style={styles.languageLabel}>{t("call.learning")}:</Text>
                    <Text style={styles.languageValue}>{foundPartner.learningLanguage}</Text>
                  </View>
                </View>

                <View style={styles.interestsSection}>
                  <Text style={styles.interestsTitle}>{t("call.commonInterests")}:</Text>
                  <View style={styles.interestsList}>
                    {foundPartner.commonInterests.map((interest, index) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.statsSection}>
                  <View style={styles.statItem}>
                    <Icon name="phone" size={16} color="#6B7280" />
                    <Text style={styles.statText}>{foundPartner.callsCompleted} {t("call.calls")}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.callActions}>
              <TouchableOpacity style={styles.declineButton} onPress={() => navigation.goBack()}>
                <Icon name="close" size={20} color="#EF4444" />
                <Text style={styles.declineButtonText}>{t("call.decline")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={() => startCall(matchData)}>
                <Icon name="videocam" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>{t("call.start")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={cancelSearch}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("call.searchingTitle")}</Text>
        <View style={styles.placeholder} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.searchSection}>
          {isSearching && (
            <Animated.View
              style={[
                styles.searchAnimationContainer,
                { transform: [{ scale: pulseAnim }, { rotate: spin }] },
              ]}
            >
              <Icon name="search" size={150} color="#4F46E5" style={styles.searchAnimation} />
            </Animated.View>
          )}

          {isFailed && (
            <Animated.View style={[styles.searchAnimationContainer, { transform: [{ scale: fadeAnim }] }]}>
              <Icon name="error-outline" size={150} color="#EF4444" style={styles.searchAnimation} />
            </Animated.View>
          )}

          <Text style={styles.searchTitle}>{getSearchStatusText()}</Text>

          <View style={styles.searchStats}>
            <View style={styles.statCard}>
              <Icon name="schedule" size={24} color="#4F46E5" />
              <Text style={styles.statValue}>{formatTime(searchTime)}</Text>
              <Text style={styles.statLabel}>{t("call.searchTime")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="hourglass-empty" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{estimatedTime}s</Text>
              <Text style={styles.statLabel}>{t("call.estimated")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="people" size={24} color="#10B981" />
              <Text style={styles.statValue}>1,247</Text>
              <Text style={styles.statLabel}>{t("call.online")}</Text>
            </View>
          </View>

          <View style={styles.criteriaSection}>
            <Text style={styles.criteriaTitle}>{t("call.criteria")}</Text>
            <View style={styles.criteriaList}>
              <View style={styles.criteriaItem}>
                <Icon name="interests" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>{preferences.interests.length} {t("call.commonInterests")}</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Icon name="person" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>{preferences.gender === "any" ? t("call.genderAny") : preferences.gender}</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Icon name="schedule" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>{preferences.callDuration} {t("call.minutes")}</Text>
              </View>
            </View>
          </View>

          {isSearching && (
            <View style={styles.progressSection}>
              <Text style={styles.progressText}>{t("call.progress")}</Text>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((searchTime / estimatedTime) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={cancelSearch}>
            <Icon name="close" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>{t("call.cancelSearch")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  searchSection: {
    alignItems: "center",
  },
  searchAnimationContainer: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  searchAnimation: {
    width: "100%",
    height: "100%",
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 24,
  },
  searchStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  criteriaSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  criteriaList: {
    gap: 8,
  },
  criteriaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  criteriaText: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressSection: {
    width: "100%",
    marginBottom: 32,
  },
  progressText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 4,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  foundSection: {
    alignItems: "center",
  },
  foundTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  foundSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  partnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  partnerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  partnerAvatar: {
    fontSize: 48,
    marginRight: 16,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  partnerLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  partnerFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  partnerCountry: {
    fontSize: 14,
    color: "#6B7280",
  },
  partnerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  partnerDetails: {
    gap: 16,
  },
  languageInfo: {
    gap: 8,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  languageLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  languageValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  interestsSection: {},
  interestsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  interestsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  interestTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  statsSection: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
  },
  callActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default CallSearchScreen