// EnhancedLeaderboardScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
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

const tabsStatic = [
  { id: "global", titleKey: "leaderboard.tabs.top100", icon: "leaderboard" },
  { id: "week", titleKey: "leaderboard.tabs.thisWeek", icon: "date-range" },
  { id: "events", titleKey: "leaderboard.tabs.events", icon: "event" },
  { id: "seasons", titleKey: "leaderboard.tabs.seasons", icon: "ac-unit" },
  { id: "friends", titleKey: "leaderboard.tabs.friends", icon: "people" },
  { id: "couples", titleKey: "leaderboard.tabs.couples", icon: "favorite" },
];

const periods = [
  { id: "all", titleKey: "leaderboard.periods.allTime" },
  { id: "month", titleKey: "leaderboard.periods.thisMonth" },
  { id: "week", titleKey: "leaderboard.periods.thisWeek" },
  { id: "today", titleKey: "leaderboard.periods.today" },
];

const PAGE_LIMIT = 20;

const EnhancedLeaderboardScreen = ({ navigation }: EnhancedLeaderboardScreenProps) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useUserStore();

  // giữ pattern factory hook của bạn
  const { useLeaderboards, useLeaderboardEntries } = useLeaderboardsHooksFactory();

  const [selectedTab, setSelectedTab] = useState<string>("global");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // leaderboard snapshot id for current tab+period
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);

  // pagination state for entries
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // --- 1) get leaderboard snapshot(s) for current tab+period (page 0 limit 1)
  const {
    data: leaderboardsResp,
    isLoading: leaderboardsLoading,
    isError: leaderboardsError,
    refetch: refetchLeaderboards,
  } = useLeaderboards({ tab: selectedTab, period: selectedPeriod, page: 0, limit: 1 });

  // parse leaderboardsResp — hook của bạn trả res.data.result (Page<LeaderboardResponse>)
  const resolvedLeaderboardList = (() => {
    const d: any = leaderboardsResp;
    if (!d) return [];
    // Page-like with content
    if (d.content && Array.isArray(d.content)) return d.content;
    // maybe direct array
    if (Array.isArray(d)) return d;
    // single object fallback
    return [d];
  })();

  // set leaderboardId to first snapshot's id when leaderboards change
  useEffect(() => {
    setPage(0); // reset pagination when snapshot changes
    const first = resolvedLeaderboardList[0];
    if (first && (first.leaderboardId || first.id)) {
      const id = String(first.leaderboardId ?? first.id);
      setLeaderboardId(id);
    } else {
      setLeaderboardId(null);
    }
  }, [leaderboardsResp, selectedTab, selectedPeriod]);

  const top3Query = useQuery({
    queryKey: ["leaderboard", leaderboardId, "top-3"],
    queryFn: async () => {
      if (!leaderboardId) return [];
      const res = await instance.get(`/leaderboards/${leaderboardId}/top-3`);
      return res.data?.result ?? res.data ?? [];
    },
    enabled: !!leaderboardId,
    staleTime: 1000 * 60,
  });

  const {
    data: entriesResp,
    isLoading: entriesLoading,
    isError: entriesError,
    refetch: refetchEntries,
  } = useLeaderboardEntries(leaderboardId, { page, limit: PAGE_LIMIT });

  const resolvedEntries = (() => {
    const d: any = entriesResp;
    if (!d) return [];
    let arr: any[] = [];
    if (d.content && Array.isArray(d.content)) arr = d.content;
    else if (Array.isArray(d)) arr = d;
    else arr = [d];

    return arr.slice(3);
  })();

  // load more handler
  const loadMore = useCallback(() => {
    if (!leaderboardId || entriesLoading) return;
    setPage((p) => p + 1);
  }, [leaderboardId, entriesLoading]);

  useEffect(() => {
    if (leaderboardId) refetchEntries();
  }, [page, leaderboardId]);

  useEffect(() => {
    refetchLeaderboards();
  }, [selectedTab, selectedPeriod]);

  const onPressUser = (entry: any) => {
    const targetUserId = entry?.leaderboardEntryId?.userId ?? entry?.userId ?? entry?.id;
    if (!targetUserId) return;
    navigation.navigate("UserProfileView", { userId: String(targetUserId) });
  };

  // ---------- renderItem (clean fields from BE) ----------
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (!item) return null;

    const uid = item?.leaderboardEntryId?.userId ?? item.userId ?? item.id;
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
        {/* Rank (list index starts at 0; Top-3 rendered separately) */}
        <View style={{ width: 36, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>{index + 4}</Text>
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
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Exp</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- UI ----------
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

        {/* Tabs */}
        <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12 }}>
          <FlatList
            horizontal
            data={tabsStatic}
            keyExtractor={(it) => it.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setSelectedTab(item.id); setPage(0); }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  backgroundColor: selectedTab === item.id ? "#3B82F6" : "#F3F4F6",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name={item.icon as any} size={16} color={selectedTab === item.id ? "#FFF" : "#6B7280"} />
                  <Text style={{ marginLeft: 6, color: selectedTab === item.id ? "#FFF" : "#374151", fontWeight: selectedTab === item.id ? "700" : "600" }}>
                    {t(item.titleKey)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Periods */}
        <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingBottom: 8 }}>
          <FlatList
            horizontal
            data={periods}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setSelectedPeriod(item.id); setPage(0); }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 18,
                  marginRight: 8,
                  backgroundColor: selectedPeriod === item.id ? "#3B82F6" : "#F3F4F6",
                }}
              >
                <Text style={{ color: selectedPeriod === item.id ? "#FFF" : "#374151", fontWeight: selectedPeriod === item.id ? "700" : "600" }}>
                  {t(item.titleKey)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Top-3 */}
        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
          {top3Query.isLoading ? (
            <ActivityIndicator />
          ) : (
            Array.isArray(top3Query.data) && top3Query.data.length >= 3 && (
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end" }}>
                {[1, 0, 2].map((pos) => {
                  const p = top3Query.data[pos];
                  if (!p) return null;
                  const placeColor = pos === 0 ? "#F59E0B" : pos === 1 ? "#9CA3AF" : "#CD7C2F";
                  return (
                    <TouchableOpacity key={pos} onPress={() => onPressUser(p)} style={{ flex: 1, alignItems: "center", marginHorizontal: 6, padding: 8 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: placeColor, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "#FFF", fontWeight: "700" }}>{pos + 1}</Text>
                      </View>
                      <Image source={{ uri: p.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28, marginTop: 8, backgroundColor: "#E5E7EB" }} />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ marginTop: 6, fontWeight: "600", maxWidth: 100 }}
                      >
                        {p.fullname}
                        {p.nickname ? ` (${p.nickname})` : ""}
                      </Text>
                      <Text style={{ color: "#6B7280", fontSize: 12 }}>
                        {t("leaderboard.level")} {typeof p.level !== "undefined" ? p.level : "-"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </View>

        {/* Entries list */}
        <View style={{ flex: 1 }}>
          {(leaderboardsLoading || entriesLoading) && page === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : entriesError || leaderboardsError ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: "red" }}>{t("leaderboard.error")}</Text>
            </View>
          ) : (
            <FlatList
              data={resolvedEntries}
              renderItem={renderItem}
              keyExtractor={(it: any, idx: number) => String(it?.leaderboardEntryId?.userId ?? it.userId ?? it.id ?? idx)}
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
