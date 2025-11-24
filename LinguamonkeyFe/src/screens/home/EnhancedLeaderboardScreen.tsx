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
    StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { LeaderboardEntryResponse, LeaderboardResponse } from "../../types/dto";
import { gotoTab } from "../../utils/navigationRef";

const tabsStatic = [
    { id: "global", titleKey: "leaderboard.tabs.global", icon: "leaderboard" },
    { id: "friends", titleKey: "leaderboard.tabs.friends", icon: "people" },
    { id: "couple", titleKey: "leaderboard.tabs.couples", icon: "favorite" },
    { id: "country", titleKey: "leaderboard.tabs.country", icon: "location-on" },
];

const PAGE_LIMIT = 20;
const PLACEHOLDER_AVATAR_URL = "https://via.placeholder.com/150/9CA3AF/FFFFFF?text=User";

const EnhancedLeaderboardScreen = () => {
    const navigation = useNavigation<any>();
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

    // Cập nhật leaderboardId khi danh sách thay đổi
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

    // FIX: Thêm option { enabled: !!leaderboardId } để chặn call API khi ID là null
    const {
        data: entriesData,
        isLoading: entriesLoading,
        isError: entriesError,
    } = useEntries(
        {
            leaderboardId: leaderboardId || undefined,
            page,
            size: PAGE_LIMIT,
        },
        { enabled: !!leaderboardId } // Quan trọng: Chỉ fetch khi đã có ID
    );

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
        const resolvedUserId = entry.userId ?? entry.leaderboardEntryId?.userId;

        if (!resolvedUserId) {
            console.warn("onPressUser: userId is missing", entry);
            return;
        }
        gotoTab("ProfileStack", "UserProfileViewScreen", { userId: resolvedUserId });
    };

    const renderItem = ({ item, index }: { item: LeaderboardEntryResponse; index: number }) => {
        if (!item) return null;

        const rank = index + 4;
        const currentUserId = item.userId ?? item.leaderboardEntryId?.userId;
        const avatarSource = { uri: item.avatarUrl || PLACEHOLDER_AVATAR_URL };

        return (
            <TouchableOpacity
                onPress={() => onPressUser(item)}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderBottomWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: currentUserId === user?.userId ? "#ECFDF5" : "#FFFFFF",
                }}
            >
                <View style={{ width: 36, alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", fontSize: 14 }}>{rank}</Text>
                </View>

                <Image
                    source={avatarSource}
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

        let placeColor: string;
        let medalIcon: string;

        switch (position) {
            case 1:
                placeColor = "#F59E0B";
                medalIcon = "emoji-events";
                break;
            case 2:
                placeColor = "#9CA3AF";
                medalIcon = "verified";
                break;
            case 3:
                placeColor = "#CD7C2F";
                medalIcon = "military-tech";
                break;
            default:
                placeColor = "#6B7280";
                medalIcon = "";
        }

        const height =
            position === 1 ? 120 :
                position === 2 ? 100 :
                    80;

        const avatarSource = { uri: entry.avatarUrl || PLACEHOLDER_AVATAR_URL };

        return (
            <TouchableOpacity
                key={position}
                onPress={() => onPressUser(entry)}
                style={{ flex: 1, alignItems: "center", marginHorizontal: 4 }}
            >
                <View style={{ position: "relative", marginBottom: 8 }}>
                    <View
                        style={{
                            position: "absolute",
                            top: -10,
                            right: -10,
                            zIndex: 10,
                            backgroundColor: placeColor,
                            borderRadius: 12,
                            padding: 2,
                        }}
                    >
                        <Icon name={medalIcon as any} size={16} color="#FFF" />
                    </View>

                    <Image
                        source={avatarSource}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: "#E5E7EB",
                            borderWidth: 3,
                            borderColor: placeColor,
                        }}
                    />

                    <View
                        style={{
                            position: "absolute",
                            bottom: -8,
                            alignSelf: "center",
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: placeColor,
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                        }}
                    >
                        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>{position}</Text>
                    </View>
                </View>

                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ fontWeight: "600", fontSize: 12, maxWidth: 90, textAlign: "center", marginTop: 8 }}
                >
                    {entry.fullname}
                </Text>

                <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>
                    {t("leaderboard.level")} {entry.level ?? "-"}
                </Text>

                <Text style={{ fontWeight: "700", fontSize: 14, marginTop: 4 }}>
                    {(entry.score ?? entry.exp ?? 0).toLocaleString()} EXP
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

    return (
        <ScreenLayout style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

                <View
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
                </View>

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
                        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", height: 250 }}>
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