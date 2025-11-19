// EnhancedLeaderboardScreen.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Animated,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import instance from "../../api/axiosInstance";
import { useLeaderboards as useLeaderboardsHooksFactory } from "../../hooks/useLeaderboards";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../../stores/UserStore";

type EnhancedLeaderboardScreenProps = {
  navigation: StackNavigationProp<any>;
};

// Tab simplification: Remove period, add proper categories
const tabsStatic = [
  { id: "global", titleKey: "leaderboard.tabs.global", icon: "leaderboard", sortBy: "level" },
  { id: "friends", titleKey: "leaderboard.tabs.friends", icon: "people", sortBy: "level" },
  { id: "couples", titleKey: "leaderboard.tabs.couples", icon: "favorite", sortBy: "level" },
  { id: "country", titleKey: "leaderboard.tabs.country", icon: "location-on", sortBy: "level" },
];

const PAGE_LIMIT = 20;

const EnhancedLeaderboardScreen = ({ navigation }: EnhancedLeaderboardScreenProps) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useUserStore();

  const { useLeaderboards, useLeaderboardEntries } = useLeaderboardsHooksFactory();

  const [selectedTab, setSelectedTab] = useState<string>("global");
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [entriesAccum, setEntriesAccum] = useState<any[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Fetch leaderboard metadata for selected tab (no period parameter)
  const {
    data: leaderboardsResp,
    isLoading: leaderboardsLoading,
    isError: leaderboardsError,
  } = useLeaderboards({ tab: selectedTab, page: 0, limit: 1 });

  const resolvedLeaderboardList = useMemo(() => {
    const d: any = leaderboardsResp;
    if (!d) return [];
    if (d.content && Array.isArray(d.content)) return d.content;
    if (Array.isArray(d)) return d;
    return [d];
  }, [leaderboardsResp]);

  // Reset pagination when tab changes
  useEffect(() => {
    setPage(0);
    const first = resolvedLeaderboardList[0];
    setHasMore(true);
    setEntriesAccum([]);
    if (first && (first.leaderboardId || first.id)) {
      const id = String(first.leaderboardId ?? first.id);
      setLeaderboardId(id);
    } else {
      setLeaderboardId(null);
    }
  }, [resolvedLeaderboardList, selectedTab]);

  // Fetch top 3 separately
  const top3Query = useQuery({
    queryKey: ["leaderboard", leaderboardId, "top-3"],
    queryFn: async () => {
      if (!leaderboardId) return [];
      const res = await instance.get(`/api/v1/leaderboards/${leaderboardId}/top-3`);
      return res.data?.result ?? res.data ?? [];
    },
    enabled: !!leaderboardId,
    staleTime: 1000 * 60,
  });

  // Fetch entries from 4 onwards (NO TOP 3)
  const {
    data: entriesResp,
    isLoading: entriesLoading,
    isError: entriesError,
  } = useLeaderboardEntries(leaderboardId, { page, limit: PAGE_LIMIT });

  // Accumulate pages
  useEffect(() => {
    const d: any = entriesResp;
    if (!d) return;

    let arr: any[] = [];
    if (d.content && Array.isArray(d.content)) arr = d.content;
    else if (Array.isArray(d)) arr = d;
    else arr = [d];

    if (page === 0) setEntriesAccum(arr);
    else setEntriesAccum((prev) => [...prev, ...arr]);

    if (arr.length < PAGE_LIMIT) setHasMore(false);
    else setHasMore(true);
  }, [entriesResp, page]);

  // Get sorted entries skipping top 3 (start from index 3)
  const resolvedEntries = entriesAccum.slice(3);

  const loadMore = useCallback(() => {
    if (!leaderboardId || entriesLoading || !hasMore) return;
    setPage((p) => p + 1);
  }, [leaderboardId, entriesLoading, hasMore]);

  const onPressUser = (entry: any) => {
    const targetUserId = entry?.leaderboardEntryId?.userId ?? entry?.userId ?? entry?.id;
    if (!targetUserId) return;
    navigation.navigate("UserProfileViewScreen", { userId: String(targetUserId) });
  };

  // Render entry from position 4+ (ranks 4, 5, 6...)
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (!item) return null;

    const uid = item?.leaderboardEntryId?.userId ?? item.userId ?? item.id;
    const rank = index + 4; // Position in list starts at 4

    return (
      <TouchableOpacity
        onPress={() => onPressUser(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: uid === user?.userId ? "#ECFDF5" : "#FFFFFF",
        }}
      >
        {/* Rank */}
        <View style={{ width: 36, alignItems: "center" }}>
          <Text style={{ fontWeight: "700", fontSize: 14 }}>{rank}</Text>
        </View>

        {/* Avatar */}
        <Image
          source={{ uri: item.avatarUrl }}
          style={{ width: 40, height: 40, borderRadius: 20, marginHorizontal: 12, backgroundColor: "#E5E7EB" }}
        />

        {/* User info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600" }}>
            {item.fullname}
            {item.nickname ? ` (${item.nickname})` : ""}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>
            {t("leaderboard.level")} {typeof item.level !== "undefined" ? item.level : "-"}
          </Text>
        </View>

        {/* Score / XP */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "700" }}>
            {(item.score ?? item.exp ?? 0).toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>EXP</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render single podium entry (top 1, 2, or 3)
  const renderPodiumEntry = (entry: any, position: number) => {
    if (!entry) return null;

    const placeColor =
      position === 1 ? "#F59E0B" : // Gold
        position === 2 ? "#9CA3AF" : // Silver
          "#CD7C2F";                   // Bronze

    const height =
      position === 1 ? 120 :
        position === 2 ? 100 :
          80;

    return (
      <TouchableOpacity
        key={position}
        onPress={() => onPressUser(entry)}
        style={{ flex: 1, alignItems: "center", marginHorizontal: 4 }}
      >
        {/* Rank badge */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: placeColor,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{position}</Text>
        </View>

        {/* Avatar */}
        <Image
          source={{ uri: entry.avatarUrl }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            marginBottom: 8,
            backgroundColor: "#E5E7EB",
            borderWidth: 3,
            borderColor: placeColor,
          }}
        />

        {/* Name */}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ fontWeight: "600", fontSize: 12, maxWidth: 90, textAlign: "center" }}
        >
          {entry.fullname}
          {entry.nickname ? ` (${entry.nickname})` : ""}
        </Text>

        {/* Level */}
        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>
          {t("leaderboard.level")} {typeof entry.level !== "undefined" ? entry.level : "-"}
        </Text>

        {/* Podium base */}
        <View
          style={{
            width: "100%",
            height: height,
            backgroundColor: placeColor,
            marginTop: 8,
            opacity: 0.2,
            borderRadius: 4,
          }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* Header */}
        <SafeAreaView
          edges={["top"]}
          style={{
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 12 : 12,
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              {t("leaderboard.title")}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>

        {/* Tab selection (NO PERIODS) */}
        <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12 }}>
          <FlatList
            horizontal
            data={tabsStatic}
            keyExtractor={(it) => it.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedTab(item.id);
                  setPage(0);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  backgroundColor: selectedTab === item.id ? "#3B82F6" : "#F3F4F6",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon
                    name={item.icon as any}
                    size={16}
                    color={selectedTab === item.id ? "#FFF" : "#6B7280"}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: selectedTab === item.id ? "#FFF" : "#374151",
                      fontWeight: selectedTab === item.id ? "700" : "600",
                      fontSize: 13,
                    }}
                  >
                    {t(item.titleKey)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Top 3 Podium */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
          {top3Query.isLoading ? (
            <ActivityIndicator size="small" />
          ) : Array.isArray(top3Query.data) && top3Query.data.length >= 3 ? (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", height: 200 }}>
              {/* Position 2 (Silver) */}
              {renderPodiumEntry(top3Query.data[1], 2)}
              {/* Position 1 (Gold) */}
              {renderPodiumEntry(top3Query.data[0], 1)}
              {/* Position 3 (Bronze) */}
              {renderPodiumEntry(top3Query.data[2], 3)}
            </View>
          ) : (
            <Text style={{ color: "#9CA3AF", textAlign: "center", paddingVertical: 12 }}>
              {t("leaderboard.noData")}
            </Text>
          )}
        </View>

        {/* Entries list (4+) */}
        <View style={{ flex: 1 }}>
          {(leaderboardsLoading || entriesLoading) && page === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : entriesError || leaderboardsError ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: "red" }}>{t("leaderboard.error")}</Text>
            </View>
          ) : resolvedEntries.length === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF" }}>{t("leaderboard.noMoreEntries")}</Text>
            </View>
          ) : (
            <FlatList
              data={resolvedEntries}
              renderItem={renderItem}
              keyExtractor={(it: any, idx: number) =>
                String(it?.leaderboardEntryId?.userId ?? it.userId ?? it.id ?? idx)
              }
              onEndReached={() => loadMore()}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => (entriesLoading ? <ActivityIndicator style={{ padding: 12 }} /> : null)}
            />
          )}
        </View>

      </Animated.View>
    </View>
  );
};

export default EnhancedLeaderboardScreen;