import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Animated,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { LeaderboardEntryResponse, LeaderboardResponse } from "../../types/dto";

const tabsStatic = [
  { id: "global", titleKey: "leaderboard.tabs.global", icon: "leaderboard" },
  { id: "friends", titleKey: "leaderboard.tabs.friends", icon: "people" },
  { id: "couple", titleKey: "leaderboard.tabs.couples", icon: "favorite" },
  { id: "country", titleKey: "leaderboard.tabs.country", icon: "location-on" },
];

const PAGE_LIMIT = 20;

const EnhancedLeaderboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useUserStore();

  const { useLeaderboardList, useEntries } = useLeaderboards();

  const [selectedTab, setSelectedTab] = useState<string>("global");
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [entriesAccum, setEntriesAccum] = useState<LeaderboardEntryResponse[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const {
    data: leaderboardsData,
    isLoading: leaderboardsLoading,
    isError: leaderboardsError,
  } = useLeaderboardList({ tab: selectedTab, page: 0, size: 1 });

  const resolvedLeaderboardList = useMemo(() => {
    if (!leaderboardsData?.data) return [];
    return leaderboardsData.data as LeaderboardResponse[];
  }, [leaderboardsData]);

  useEffect(() => {
    setPage(0);
    const first = resolvedLeaderboardList[0];
    setHasMore(true);
    setEntriesAccum([]);
    if (first?.leaderboardId) {
      setLeaderboardId(first.leaderboardId);
    } else {
      setLeaderboardId(null);
    }
  }, [resolvedLeaderboardList, selectedTab]);

  const {
    data: entriesData,
    isLoading: entriesLoading,
    isError: entriesError,
  } = useEntries({
    leaderboardId: leaderboardId || undefined,
    page,
    size: PAGE_LIMIT,
  });

  useEffect(() => {
    if (!entriesData?.data) return;

    const arr = entriesData.data as LeaderboardEntryResponse[];

    if (page === 0) setEntriesAccum(arr);
    else setEntriesAccum((prev) => [...prev, ...arr]);

    if (arr.length < PAGE_LIMIT) setHasMore(false);
    else setHasMore(true);
  }, [entriesData, page]);

  const top3Data = entriesAccum.slice(0, 3);
  const resolvedEntries = entriesAccum.slice(3);

  const loadMore = useCallback(() => {
    if (!leaderboardId || entriesLoading || !hasMore) return;
    setPage((p) => p + 1);
  }, [leaderboardId, entriesLoading, hasMore]);

  const onPressUser = (entry: LeaderboardEntryResponse) => {
    if (!entry.userId) return;
    (navigation as any).navigate("UserProfileViewScreen", { userId: entry.userId });
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntryResponse; index: number }) => {
    if (!item) return null;

    const rank = index + 4;

    return (
      <TouchableOpacity
        onPress={() => onPressUser(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: item.userId === user?.userId ? "#ECFDF5" : "#FFFFFF",
        }}
      >
        <View style={{ width: 36, alignItems: "center" }}>
          <Text style={{ fontWeight: "700", fontSize: 14 }}>{rank}</Text>
        </View>

        <Image
          source={{ uri: item.avatarUrl }}
          style={{ width: 40, height: 40, borderRadius: 20, marginHorizontal: 12, backgroundColor: "#E5E7EB" }}
        />

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600" }}>
            {item.fullname}
            {item.nickname ? ` (${item.nickname})` : ""}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>
            {t("leaderboard.level")} {item.level ?? "-"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "700" }}>
            {(item.score ?? item.exp ?? 0).toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>EXP</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPodiumEntry = (entry: LeaderboardEntryResponse, position: number) => {
    if (!entry) return null;

    const placeColor =
      position === 1 ? "#F59E0B" :
        position === 2 ? "#9CA3AF" :
          "#CD7C2F";

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

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ fontWeight: "600", fontSize: 12, maxWidth: 90, textAlign: "center" }}
        >
          {entry.fullname}
          {entry.nickname ? ` (${entry.nickname})` : ""}
        </Text>

        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>
          {t("leaderboard.level")} {entry.level ?? "-"}
        </Text>

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

  return (<ScreenLayout style={{ flex: 1, backgroundColor: "#FFFFFF" }}> <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

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

    <View style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
      {entriesLoading && page === 0 && top3Data.length === 0 ? (
        <ActivityIndicator size="small" />
      ) : top3Data.length > 0 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", height: 200 }}>
          {renderPodiumEntry(top3Data[1], 2)}
          {renderPodiumEntry(top3Data[0], 1)}
          {renderPodiumEntry(top3Data[2], 3)}
        </View>
      ) : (
        <Text style={{ color: "#9CA3AF", textAlign: "center", paddingVertical: 12 }}>
          {t("leaderboard.noData")}
        </Text>
      )}
    </View>

    <View style={{ flex: 1 }}>
      {(leaderboardsLoading || entriesLoading) && page === 0 && top3Data.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : entriesError || leaderboardsError ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: "red" }}>{t("leaderboard.error")}</Text>
        </View>
      ) : resolvedEntries.length === 0 && top3Data.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#9CA3AF" }}>{t("leaderboard.noMoreEntries")}</Text>
        </View>
      ) : (
        <FlatList
          data={resolvedEntries}
          renderItem={renderItem}
          keyExtractor={(it, idx) =>
            String(it.userId ?? idx)
          }
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (entriesLoading ? <ActivityIndicator style={{ padding: 12 }} /> : null)}
        />
      )}
    </View>

  </Animated.View>
  </ScreenLayout>
  );
};

export default EnhancedLeaderboardScreen;