import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, Animated, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useVideoCalls } from '../../hooks/useVideos';
import { CallPreferences } from '../../stores/appStore';
import { RoomResponse, WaitingResponse } from '../../types/dto';

const CallSearchScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { preferences } = route.params as { preferences: CallPreferences };
  const { t } = useTranslation();

  const { useFindCallPartner, useCancelFindMatch } = useVideoCalls();
  const { mutate: findMatch } = useFindCallPartner();
  const { mutate: cancelMatch } = useCancelFindMatch();

  // Logic States
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(300); // Default 5 mins (300s) for solitary search
  const [onlineUsersCount, setOnlineUsersCount] = useState(1);
  const [isMatchFound, setIsMatchFound] = useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState(t("call.searchingTitle")); // Initial message

  // Technical Refs
  const pollingTimeout = useRef<any>(null);
  const isMounted = useRef(true);

  // Animations
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

  // --- Match Success Handler ---
  const handleMatchSuccess = useCallback((room: RoomResponse) => {
    setIsMatchFound(true);
    stopAnimations();
    setSearchStatusMessage(t("call.matchFound")); // "Match Found!"

    setTimeout(() => {
      navigation.replace("VideoCallScreen", {
        roomId: room.roomId,
        roomName: room.roomName,
        isCaller: false,
        preferences: preferences
      });
    }, 1000);
  }, [stopAnimations, t, navigation, preferences]);

  // --- Message & Estimate Logic ---
  // Updates the message based on elapsed time vs estimated time
  const updateSearchStatus = useCallback((elapsed: number, estimate: number, count: number) => {
    if (isMatchFound) return;

    // Logic: 
    // 1. If 0 or 1 user (me), estimate is 5 mins.
    // 2. If > 1 user, estimate is faster (e.g. 1 min / users). 
    // BUT prompt says: "if 0 user other than me -> default 5 mins".

    // Update Estimate based on count
    let newEstimate = 300; // Default 5 mins
    if (count > 1) {
      // Heuristic: If there are others, it should be faster.
      newEstimate = 60;
    }
    setEstimatedSeconds(newEstimate);

    // Strict Message Logic requested by user:
    if (elapsed <= newEstimate) {
      // Normal phase
      setSearchStatusMessage(t("call.searchingTitle"));
    }
    else if (elapsed > newEstimate && elapsed <= newEstimate + 60) {
      // Exceeded estimate but within 1 min buffer
      setSearchStatusMessage(t("call.pleaseWaitMessage"));
    }
    else if (elapsed > newEstimate + 60) {
      // Exceeded estimate + 1 min
      setSearchStatusMessage(t("call.longWaitMessage"));
    }

  }, [isMatchFound, t]);


  // --- Core Logic: Polling Loop ---
  const performSearch = useCallback(() => {
    if (!isMounted.current || isMatchFound) return;

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

          // Case 1: Match Found (200)
          if (response.code === 200 && response.data && 'roomId' in response.data) {
            handleMatchSuccess(response.data as RoomResponse);
          }
          // Case 2: Waiting in Queue (202)
          else if (response.code === 202) {
            const data = response.data as any; // WaitingResponse map
            const qSize = data?.queueSize || 1;
            setOnlineUsersCount(qSize);

            // Wait 5 seconds before next poll (Realtime requirement)
            pollingTimeout.current = setTimeout(() => {
              performSearch();
            }, 5000);
          }
        },
        onError: (error) => {
          console.error("Match error:", error);
          if (!isMounted.current) return;
          // Even on error, we might want to retry or stop. 
          // For now, retry slower to avoid hammering if server is down
          pollingTimeout.current = setTimeout(() => {
            performSearch();
          }, 10000);
        }
      }
    );
  }, [findMatch, preferences, handleMatchSuccess, isMatchFound]);

  // --- Effects ---
  useEffect(() => {
    isMounted.current = true;
    startAnimations();
    performSearch();

    // Timer for elapsed time and UI updates
    const timerInterval = setInterval(() => {
      if (isMounted.current && !isMatchFound) {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);

        // Update message dynamically inside the timer to ensure accuracy
        // We use state values inside updater to avoid dependency stale closures if needed, 
        // but here we rely on the component re-render for `estimatedSeconds` and `onlineUsersCount`
        updateSearchStatus(elapsed, estimatedSeconds, onlineUsersCount);
      }
    }, 1000);

    return () => {
      isMounted.current = false;
      clearInterval(timerInterval);
      if (pollingTimeout.current) clearTimeout(pollingTimeout.current);
      stopAnimations();
    };
  }, [startAnimations, performSearch, stopAnimations, startTime, estimatedSeconds, onlineUsersCount, updateSearchStatus, isMatchFound]);

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
        <View style={styles.logoContainer}>
          <Icon name="language" size={28} color="#4F46E5" />
          <Text style={styles.logoText}>MonkeyLingua</Text>
        </View>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.searchSection}>

          {/* Dynamic Message: Only Title, Bold */}
          <Text style={[styles.messageTitle, isMatchFound && { color: '#10B981' }]}>
            {searchStatusMessage}
          </Text>

          <Animated.View
            style={[
              styles.searchAnimationContainer,
              { transform: [{ scale: isMatchFound ? 1.2 : pulseAnim }, { rotate: isMatchFound ? '0deg' : spin }] },
            ]}
          >
            {isMatchFound ? (
              <Icon name="check-circle" size={140} color="#10B981" />
            ) : (
              <Icon name="search" size={140} color="#4F46E5" style={styles.searchAnimation} />
            )}
          </Animated.View>

          <View style={styles.searchStats}>
            <View style={styles.statCard}>
              <Icon name="timer" size={24} color="#4F46E5" />
              <Text style={styles.statValue}>{formatTime(estimatedSeconds)}</Text>
              <Text style={styles.statLabel}>{t("call.estimatedWait")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="people" size={24} color="#10B981" />
              <Text style={styles.statValue}>{onlineUsersCount}</Text>
              <Text style={styles.statLabel}>{t("call.onlineUsers")}</Text>
            </View>
          </View>

          {/* Currently elapsed time for user reference */}
          <Text style={styles.elapsedText}>
            {t("call.elapsedTime")}: {formatTime(elapsedSeconds)}
          </Text>

          <View style={styles.criteriaSection}>
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
            </View>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  logoContainer: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  logoText: {
    fontSize: 18, fontWeight: "800", color: "#4F46E5", letterSpacing: -0.5,
  },
  closeButton: { padding: 4 },

  content: { flex: 1, justifyContent: "center", padding: 20 },
  searchSection: { alignItems: "center", width: "100%" },

  // New Message Style
  messageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 30
  },

  searchAnimationContainer: { width: 150, height: 150, marginBottom: 40, alignItems: 'center', justifyContent: 'center' },
  searchAnimation: {},

  searchStats: { flexDirection: "row", gap: 16, marginBottom: 20 },
  statCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, alignItems: "center", minWidth: 110,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1F2937", marginTop: 8 },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4, fontWeight: "500" },

  elapsedText: {
    fontSize: 14, color: "#9CA3AF", marginBottom: 30, fontVariant: ['tabular-nums']
  },

  criteriaSection: {
    backgroundColor: "#F1F5F9", borderRadius: 12, padding: 12, width: "100%", marginBottom: 24,
    alignItems: "center"
  },
  criteriaList: { flexDirection: "row", gap: 16, justifyContent: "center" },
  criteriaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  criteriaText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },

  cancelButton: {
    paddingVertical: 12, paddingHorizontal: 32,
  },
  cancelButtonText: { fontSize: 16, color: "#EF4444", fontWeight: "600" },
});

export default CallSearchScreen;