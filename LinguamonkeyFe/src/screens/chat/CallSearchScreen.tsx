import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Animated, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useVideoCalls } from '../../hooks/useVideos';
import { CallPreferences } from '../../stores/appStore';
import { RoomResponse } from '../../types/dto';

const CallSearchScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { preferences } = route.params as { preferences: CallPreferences };
  const { t } = useTranslation();

  const { useFindCallPartner, useCancelFindMatch } = useVideoCalls();
  const { mutate: findMatch } = useFindCallPartner();
  const { mutate: cancelMatch } = useCancelFindMatch();

  const [searchTime, setSearchTime] = useState(0);
  const [statusText, setStatusText] = useState(t("call.connecting"));
  const [isMatchFound, setIsMatchFound] = useState(false);

  // FIX 1: Dùng 'any' cho timeout ref để tránh lỗi "Type 'number' is not assignable to type 'Timeout'"
  // React Native setTimeout trả về number, trong khi Type definition mặc định có thể là NodeJS.Timeout
  const pollingTimeout = useRef<any>(null);
  const isMounted = useRef(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // --- Animation Logic ---
  const startAnimations = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, [fadeAnim, pulseAnim, rotateAnim]);

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();
  }, [pulseAnim, rotateAnim]);

  // FIX 2: Move handleMatchSuccess lên trước và bọc bằng useCallback
  const handleMatchSuccess = useCallback((room: RoomResponse) => {
    setIsMatchFound(true);
    stopAnimations();
    setStatusText(t("call.matchFound") || "Partner Found!");

    setTimeout(() => {
      navigation.replace("VideoCallScreen", {
        roomId: room.roomId,
        roomName: room.roomName,
        isCaller: false,
        preferences: preferences
      });
    }, 1000);
  }, [stopAnimations, t, navigation, preferences]);

  // --- Core Logic: Polling ---
  const performSearch = useCallback(() => {
    if (!isMounted.current) return;

    console.log("Polling for match...");

    findMatch(
      {
        interests: preferences.interests,
        gender: preferences.gender,
        nativeLanguage: preferences.nativeLanguage,
        learningLanguage: preferences.learningLanguage,
        ageRange: preferences.ageRange,
        callDuration: preferences.callDuration,
      },
      {
        onSuccess: (response) => {
          if (!isMounted.current) return;

          if (response.code === 200 && response.data) {
            console.log("Match found:", response.data);
            handleMatchSuccess(response.data);
          }
          else if (response.code === 202) {
            setStatusText(t("call.waitingInQueue") || "Looking for a partner...");
            pollingTimeout.current = setTimeout(() => {
              performSearch();
            }, 3000);
          }
        },
        onError: (error) => {
          console.error("Match error:", error);
          if (!isMounted.current) return;
          stopAnimations();
          Alert.alert(t("common.error"), t("call.searchFailedMessage"), [
            { text: t("common.goBack"), onPress: () => navigation.goBack() }
          ]);
        }
      }
    );
  }, [findMatch, preferences, t, stopAnimations, navigation, handleMatchSuccess]); // FIX 3: Đã thêm handleMatchSuccess vào deps

  // --- Lifecycle ---
  useEffect(() => {
    isMounted.current = true;
    startAnimations();

    const timer = setInterval(() => setSearchTime((prev) => prev + 1), 1000);

    performSearch();

    return () => {
      isMounted.current = false;
      clearInterval(timer);
      if (pollingTimeout.current) clearTimeout(pollingTimeout.current);
      stopAnimations();
    };
  }, [startAnimations, performSearch, stopAnimations]);

  const handleCancel = () => {
    if (pollingTimeout.current) clearTimeout(pollingTimeout.current);
    cancelMatch();
    navigation.goBack();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("call.searchingTitle")}</Text>
        <View style={styles.placeholder} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.searchSection}>

          <Animated.View
            style={[
              styles.searchAnimationContainer,
              { transform: [{ scale: isMatchFound ? 1.2 : pulseAnim }, { rotate: isMatchFound ? '0deg' : spin }] },
            ]}
          >
            {isMatchFound ? (
              <Icon name="check-circle" size={150} color="#10B981" />
            ) : (
              <Icon name="search" size={150} color="#4F46E5" style={styles.searchAnimation} />
            )}
          </Animated.View>

          <Text style={[styles.searchTitle, isMatchFound && { color: '#10B981' }]}>{statusText}</Text>

          <View style={styles.searchStats}>
            <View style={styles.statCard}>
              <Icon name="schedule" size={24} color="#4F46E5" />
              <Text style={styles.statValue}>{formatTime(searchTime)}</Text>
              <Text style={styles.statLabel}>{t("call.searchTime")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="people" size={24} color="#10B981" />
              <Text style={styles.statValue}>Online</Text>
              <Text style={styles.statLabel}>{t("call.findingMatch")}</Text>
            </View>
          </View>

          <View style={styles.criteriaSection}>
            <Text style={styles.criteriaTitle}>{t("call.criteria")}</Text>
            <View style={styles.criteriaList}>
              <View style={styles.criteriaItem}>
                <Icon name="translate" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>
                  {preferences.learningLanguage} <Icon name="arrow-forward" size={12} /> {preferences.nativeLanguage}
                </Text>
              </View>
              <View style={styles.criteriaItem}>
                <Icon name="interests" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>{preferences.interests.length} {t("call.commonInterests")}</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Icon name="timer" size={16} color="#6B7280" />
                <Text style={styles.criteriaText}>{preferences.callDuration} {t("call.minutes")}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Icon name="close" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>{t("call.cancelSearch")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  placeholder: { width: 24 },
  content: { flex: 1, justifyContent: "center", padding: 20 },
  searchSection: { alignItems: "center" },
  searchAnimationContainer: { width: 150, height: 150, marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  searchAnimation: {},
  searchTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 24 },
  searchStats: { flexDirection: "row", gap: 16, marginBottom: 32 },
  statCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, alignItems: "center", minWidth: 100,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginTop: 8 },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  criteriaSection: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, width: "100%", marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  criteriaTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
  criteriaList: { gap: 8 },
  criteriaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  criteriaText: { fontSize: 14, color: "#6B7280" },
  cancelButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, borderWidth: 1, borderColor: "#EF4444", gap: 8,
  },
  cancelButtonText: { fontSize: 16, color: "#EF4444", fontWeight: "500" },
});

export default CallSearchScreen;