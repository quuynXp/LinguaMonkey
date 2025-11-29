import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    Animated,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    StyleSheet
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { useUsers } from "../../hooks/useUsers";
import { useToast } from "../../utils/useToast"; // Sử dụng Toast thay vì Alert
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { LeaderboardEntryResponse, LeaderboardResponse } from "../../types/dto";
import { gotoTab } from "../../utils/navigationRef";

const PAGE_LIMIT = 20;

// Sử dụng require cho assets images
const PLACEHOLDER_MALE = require("../../assets/images/placeholder_male.png");
const PLACEHOLDER_FEMALE = require("../../assets/images/placeholder_female.png");
const PLACEHOLDER_DEFAULT = require("../../assets/images/placeholder_male.png");

const tabsStatic = [
    { id: "global", titleKey: "leaderboard.tabs.global", icon: "leaderboard" },
    { id: "friends", titleKey: "leaderboard.tabs.friends", icon: "people" },
    { id: "couple", titleKey: "leaderboard.tabs.couples", icon: "favorite" },
    { id: "country", titleKey: "leaderboard.tabs.country", icon: "location-on" },
    { id: "admire", titleKey: "leaderboard.tabs.admire", icon: "star" }, // Thêm tab Admire
];

const EnhancedLeaderboardScreen = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { user } = useUserStore();
    const currentUserId = user?.userId;

    const { showToast } = useToast();
    const { useLeaderboardList, useEntries } = useLeaderboards();
    const { useSendFriendRequest } = useUsers();

    const sendFriendRequestMutation = useSendFriendRequest();

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
        setHasMore(true);
        setEntriesAccum([]);

        const first = resolvedLeaderboardList[0];
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
    } = useEntries(
        {
            leaderboardId: leaderboardId || undefined,
            page,
            size: PAGE_LIMIT,
        },
        { enabled: !!leaderboardId }
    );

    useEffect(() => {
        if (!entriesData?.data) return;

        const arr = entriesData.data as LeaderboardEntryResponse[];

        if (page === 0) setEntriesAccum(arr);
        else setEntriesAccum((prev) => [...prev, ...arr]);

        if (arr.length < PAGE_LIMIT) setHasMore(false);
        else setHasMore(true);
    }, [entriesData, page]);

    const top3Data = useMemo(() => entriesAccum.slice(0, 3), [entriesAccum]);
    const resolvedEntries = useMemo(() => entriesAccum.slice(3), [entriesAccum]);

    const loadMore = useCallback(() => {
        if (!leaderboardId || entriesLoading || !hasMore) return;
        setPage((p) => p + 1);
    }, [leaderboardId, entriesLoading, hasMore]);

    const onPressUser = (entry: LeaderboardEntryResponse) => {
        const resolvedUserId = entry.userId ?? entry.leaderboardEntryId?.userId;

        if (!resolvedUserId) return;

        if (resolvedUserId !== currentUserId) {
            // Logic gửi kết bạn tạm thời comment lại để focus vào hiển thị
            // Nếu cần kích hoạt lại, sử dụng showToast thay vì Alert
            /*
            sendFriendRequestMutation.mutate(
                { requesterId: currentUserId, receiverId: resolvedUserId },
                {
                    onSuccess: () => {
                        showToast({ message: t("leaderboard.friendRequest.success"), type: "success" });
                    },
                    onError: (error: any) => {
                        showToast({ message: error.message, type: "error" });
                    },
                }
            );
            */
        }
        gotoTab("ProfileStack", "UserProfileViewScreen", { userId: resolvedUserId });
    };

    const getAvatarSource = (url?: string, gender?: string) => {
        if (url) return { uri: url };
        if (gender === "MALE" || gender === "Nam") return PLACEHOLDER_MALE;
        if (gender === "FEMALE" || gender === "Nữ") return PLACEHOLDER_FEMALE;
        return PLACEHOLDER_DEFAULT;
    };

    const renderHeader = () => {
        return (
            <View>
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {t("leaderboard.title")}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.tabsContainer}>
                    <FlatList
                        horizontal
                        data={tabsStatic}
                        keyExtractor={(it) => it.id}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    if (selectedTab !== item.id) {
                                        setSelectedTab(item.id);
                                    }
                                }}
                                style={[
                                    styles.tabItem,
                                    { backgroundColor: selectedTab === item.id ? "#3B82F6" : "#F3F4F6" }
                                ]}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Icon
                                        name={item.icon as any}
                                        size={16}
                                        color={selectedTab === item.id ? "#FFF" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.tabText,
                                            {
                                                color: selectedTab === item.id ? "#FFF" : "#374151",
                                                fontWeight: selectedTab === item.id ? "700" : "600",
                                            }
                                        ]}
                                    >
                                        {t(item.titleKey)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <View style={styles.podiumContainer}>
                    {entriesLoading && page === 0 && top3Data.length === 0 ? (
                        <ActivityIndicator size="small" style={{ marginVertical: 40 }} />
                    ) : top3Data.length > 0 ? (
                        <View style={styles.podiumWrapper}>
                            {renderPodiumEntry(top3Data[1], 2)}
                            {renderPodiumEntry(top3Data[0], 1)}
                            {renderPodiumEntry(top3Data[2], 3)}
                        </View>
                    ) : (
                        <Text style={styles.noDataText}>
                            {t("leaderboard.noData")}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const renderPodiumEntry = (entry: LeaderboardEntryResponse, position: number) => {
        if (!entry) return <View style={{ flex: 1, marginHorizontal: 4 }} />;

        let placeColor: string;
        let medalIcon: string;

        switch (position) {
            case 1: placeColor = "#F59E0B"; medalIcon = "emoji-events"; break;
            case 2: placeColor = "#9CA3AF"; medalIcon = "verified"; break;
            case 3: placeColor = "#CD7C2F"; medalIcon = "military-tech"; break;
            default: placeColor = "#6B7280"; medalIcon = "";
        }

        // Hạ thấp chiều cao podium: 90 / 70 / 50
        const height = position === 1 ? 90 : position === 2 ? 70 : 50;
        const avatarSource = getAvatarSource(entry.avatarUrl, entry.gender);

        // Dữ liệu hiển thị riêng
        const score = entry.score ?? 0;
        const exp = entry.exp ?? 0;

        return (
            <TouchableOpacity
                key={position}
                onPress={() => onPressUser(entry)}
                style={styles.podiumItem}
            >
                <View style={{ position: "relative", marginBottom: 8 }}>
                    <View style={[styles.medalBadge, { backgroundColor: placeColor }]}>
                        <Icon name={medalIcon as any} size={16} color="#FFF" />
                    </View>

                    <Image
                        source={avatarSource}
                        style={[styles.podiumAvatar, { borderColor: placeColor }]}
                    />

                    <View style={[styles.rankBadge, { backgroundColor: placeColor }]}>
                        <Text style={styles.rankBadgeText}>{position}</Text>
                    </View>
                </View>

                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.podiumName}>
                    {entry.fullname}
                </Text>

                <Text style={styles.podiumLevel}>
                    Lv.{entry.level ?? 0}
                </Text>

                {/* Hiển thị riêng Score và Exp */}
                <View style={styles.statsContainer}>
                    <Text style={[styles.podiumScore, { color: placeColor }]}>
                        {score.toLocaleString()} <Text style={styles.unitText}>pts</Text>
                    </Text>
                    <Text style={styles.podiumExp}>
                        {exp.toLocaleString()} <Text style={styles.unitText}>exp</Text>
                    </Text>
                </View>

                <View style={[styles.podiumBar, { height: height, backgroundColor: placeColor }]} />
            </TouchableOpacity>
        );
    };

    const renderListEntry = ({ item, index }: { item: LeaderboardEntryResponse; index: number }) => {
        if (!item) return null;

        const rank = index + 4;
        const currentEntryUserId = item.userId ?? item.leaderboardEntryId?.userId;
        const isMe = currentEntryUserId === user?.userId;
        const avatarSource = getAvatarSource(item.avatarUrl, item.gender);

        const score = item.score ?? 0;
        const exp = item.exp ?? 0;

        return (
            <TouchableOpacity
                onPress={() => onPressUser(item)}
                style={[
                    styles.listItem,
                    { backgroundColor: isMe ? "#ECFDF5" : "#FFFFFF" }
                ]}
            >
                <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>{rank}</Text>
                </View>

                <Image source={avatarSource} style={styles.listAvatar} />

                <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>
                        {item.fullname}
                        {item.nickname ? ` (${item.nickname})` : ""}
                    </Text>
                    <Text style={styles.listLevel}>
                        Lv.{item.level ?? 0}
                    </Text>
                </View>

                {/* Hiển thị riêng Score và Exp trong list */}
                <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.listScore}>
                        {score.toLocaleString()} <Text style={styles.unitTextSmall}>pts</Text>
                    </Text>
                    <Text style={styles.listExp}>
                        {exp.toLocaleString()} <Text style={styles.unitTextSmall}>exp</Text>
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!entriesLoading) return null;
        return <ActivityIndicator style={{ padding: 12 }} />;
    };

    const renderEmpty = () => {
        if (entriesLoading || top3Data.length > 0) return null;
        if (entriesError || leaderboardsError) {
            return (
                <View style={styles.centerEmpty}>
                    <Text style={{ color: "red" }}>{t("leaderboard.error")}</Text>
                </View>
            );
        }
        return (
            <View style={styles.centerEmpty}>
                <Text style={{ color: "#9CA3AF" }}>{t("leaderboard.noMoreEntries")}</Text>
            </View>
        );
    };

    return (
        <ScreenLayout style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    data={resolvedEntries}
                    renderItem={renderListEntry}
                    keyExtractor={(it, idx) => String(it.userId ?? idx)}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                />
            </Animated.View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    headerBar: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    tabsContainer: {
        flexDirection: "row",
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF"
    },
    tabItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    tabText: {
        marginLeft: 6,
        fontSize: 13,
    },
    podiumContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#F9FAFB",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        minHeight: 280,
    },
    podiumWrapper: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        height: 250,
    },
    podiumItem: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 4,
    },
    medalBadge: {
        position: "absolute",
        top: -10,
        right: -10,
        zIndex: 10,
        borderRadius: 12,
        padding: 2,
    },
    podiumAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#E5E7EB",
        borderWidth: 3,
    },
    rankBadge: {
        position: "absolute",
        bottom: -8,
        alignSelf: "center",
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    rankBadgeText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 12,
    },
    podiumName: {
        fontWeight: "600",
        fontSize: 12,
        maxWidth: 90,
        textAlign: "center",
        marginTop: 8,
    },
    podiumLevel: {
        color: "#6B7280",
        fontSize: 11,
        marginTop: 4,
    },
    statsContainer: {
        alignItems: 'center',
        marginTop: 4
    },
    podiumScore: {
        fontWeight: "700",
        fontSize: 13,
    },
    podiumExp: {
        fontSize: 11,
        color: "#6B7280",
    },
    unitText: {
        fontSize: 10,
        fontWeight: "400"
    },
    podiumBar: {
        width: "100%",
        marginTop: 8,
        opacity: 0.2,
        borderRadius: 4,
    },
    noDataText: {
        color: "#9CA3AF",
        textAlign: "center",
        paddingVertical: 12,
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
    },
    rankContainer: {
        width: 36,
        alignItems: "center",
    },
    rankText: {
        fontWeight: "700",
        fontSize: 14,
    },
    listAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginHorizontal: 12,
        backgroundColor: "#E5E7EB",
    },
    listName: {
        fontWeight: "600",
    },
    listLevel: {
        color: "#6B7280",
        fontSize: 12,
    },
    listScore: {
        fontWeight: "700",
        fontSize: 14,
        color: "#374151"
    },
    listExp: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    unitTextSmall: {
        fontSize: 10,
    },
    centerEmpty: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    }
});

export default EnhancedLeaderboardScreen;