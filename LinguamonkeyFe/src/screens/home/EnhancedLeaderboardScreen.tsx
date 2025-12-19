import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    Animated,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    StyleSheet,
    ViewToken
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { LeaderboardEntryResponse } from "../../types/dto";
import { gotoTab } from "../../utils/navigationRef";
import { getCountryFlag } from "../../utils/flagUtils";

const PAGE_LIMIT = 20;
const PLACEHOLDER_DEFAULT = require("../../assets/images/placeholder_male.png");

const tabsStatic = [
    { id: "global", titleKey: "leaderboard.tabs.global", icon: "public", unit: "exp" },
    { id: "admire", titleKey: "leaderboard.tabs.admire", icon: "favorite", unit: "likes" },
    { id: "hours", titleKey: "leaderboard.tabs.hours", icon: "schedule", unit: "hrs" },
    { id: "coins", titleKey: "leaderboard.tabs.coins", icon: "monetization-on", unit: "coins" },
];

const EnhancedLeaderboardScreen = () => {
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { user } = useUserStore();
    const currentUserId = user?.userId;

    const { useLeaderboardList, useEntries, useMyEntry } = useLeaderboards();

    const [selectedTab, setSelectedTab] = useState<string>("global");
    const [leaderboardId, setLeaderboardId] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [entriesAccum, setEntriesAccum] = useState<LeaderboardEntryResponse[]>([]);
    const [isMeVisible, setIsMeVisible] = useState(true);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, []);

    const { data: leaderboardsPage } = useLeaderboardList({ tab: selectedTab });

    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setEntriesAccum([]);
        setIsMeVisible(false);

        const list = leaderboardsPage?.content || [];
        if (list.length > 0) {
            setLeaderboardId(list[0].leaderboardId);
        } else {
            setLeaderboardId(null);
        }
    }, [leaderboardsPage, selectedTab]);

    const { data: entriesData, isLoading: entriesLoading } = useEntries(
        { leaderboardId: leaderboardId || undefined, page, size: PAGE_LIMIT },
        { enabled: !!leaderboardId }
    );

    const { data: myEntry } = useMyEntry(leaderboardId, currentUserId);

    useEffect(() => {
        if (!entriesData?.data) return;
        const newEntries = entriesData.data;

        setEntriesAccum(prev => (page === 0 ? newEntries : [...prev, ...newEntries]));
        setHasMore(!entriesData.pagination.isLast);
    }, [entriesData, page]);

    const top3Data = useMemo(() => entriesAccum.slice(0, 3), [entriesAccum]);
    const listData = useMemo(() => entriesAccum.slice(3), [entriesAccum]);

    const loadMore = useCallback(() => {
        if (leaderboardId && !entriesLoading && hasMore) setPage(p => p + 1);
    }, [leaderboardId, entriesLoading, hasMore]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (!currentUserId) return;
        const isVisible = viewableItems.some(item => {
            const entry = item.item as LeaderboardEntryResponse;
            const entryUserId = entry?.userId ?? entry?.leaderboardEntryId?.userId;
            return entryUserId === currentUserId;
        });

        const isInTop3 = top3Data.some(e => (e.userId ?? e.leaderboardEntryId?.userId) === currentUserId);

        if (isInTop3) {
            setIsMeVisible(true);
        } else {
            setIsMeVisible(isVisible);
        }
    }).current;

    const currentTabUnit = useMemo(() => {
        return tabsStatic.find(t => t.id === selectedTab)?.unit || "pts";
    }, [selectedTab]);

    const formatScore = (val: number) => {
        if (selectedTab === 'hours') return (val / 60).toFixed(1);
        return val.toLocaleString();
    };

    const handlePressUser = (entry: LeaderboardEntryResponse) => {
        const targetId = entry.userId ?? entry.leaderboardEntryId?.userId;
        if (targetId && targetId !== currentUserId) {
            gotoTab("ProfileStack", "UserProfileViewScreen", { userId: targetId });
        }
    };

    const renderItem = ({ item, index }: { item: LeaderboardEntryResponse, index: number }) => {
        const rank = index + 4;
        const isMe = (item.userId ?? item.leaderboardEntryId?.userId) === currentUserId;
        return (
            <LeaderboardRow
                rank={rank}
                entry={item}
                isMe={isMe}
                unit={currentTabUnit}
                formatter={formatScore}
                onPress={() => handlePressUser(item)}
                tabId={selectedTab}
            />
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            <Header
                tabs={tabsStatic}
                selectedTab={selectedTab}
                onSelectTab={setSelectedTab}
                navigation={navigation}
            />

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.leaderboardEntryId?.userId || item.userId)}
                    ListHeaderComponent={
                        <Podium
                            data={top3Data}
                            unit={currentTabUnit}
                            loading={entriesLoading && page === 0}
                            formatter={formatScore}
                            onPressUser={handlePressUser}
                            tabId={selectedTab}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    ListFooterComponent={entriesLoading && page > 0 ? <ActivityIndicator style={{ padding: 10 }} /> : null}
                />
            </Animated.View>

            {!isMeVisible && myEntry && (
                <View style={styles.stickyFooter}>
                    <LeaderboardRow
                        rank={myEntry.rank || 0}
                        entry={myEntry}
                        isMe={true}
                        unit={currentTabUnit}
                        formatter={formatScore}
                        isSticky={true}
                        onPress={() => { }}
                        tabId={selectedTab}
                    />
                </View>
            )}
        </ScreenLayout>
    );
};

const LeaderboardRow = ({ rank, entry, isMe, unit, formatter, isSticky, onPress, tabId }: any) => {
    const avatarUri = entry.avatarUrl ? { uri: entry.avatarUrl } : PLACEHOLDER_DEFAULT;
    const isGlobal = tabId === 'global';
    const isAdmire = tabId === 'admire';

    // [LOGIC MỚI] Nếu là tab admire thì lấy field admire, ngược lại lấy score
    const displayScore = isAdmire ? (entry.admire ?? 0) : (entry.score ?? 0);

    return (
        <TouchableOpacity
            style={[
                styles.row,
                isMe && styles.rowMe,
                isSticky && styles.rowSticky
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.rankCol}>
                <Text style={[styles.rankText, isSticky && { color: '#3B82F6' }]}>{rank > 0 ? rank : '-'}</Text>
            </View>
            <View style={styles.avatarCol}>
                <Image source={avatarUri} style={styles.rowAvatar} />
                <View style={styles.flagIcon}>
                    {getCountryFlag(entry.country, 12)}
                </View>
            </View>
            <View style={styles.infoCol}>
                <Text style={styles.rowName} numberOfLines={1}>{entry.fullname}</Text>
                <Text style={styles.rowSubtext}>
                    {!isGlobal ? `Lv.${entry.level}` : `@${entry.nickname}`}
                </Text>
            </View>
            <View style={styles.scoreCol}>
                {isGlobal ? (
                    <>
                        <Text style={[styles.rowScore, { color: '#2563EB' }]}>Lv.{entry.level}</Text>
                        <Text style={styles.rowUnit}>{entry.exp ? entry.exp.toLocaleString() : 0} exp</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.rowScore}>{formatter(displayScore)}</Text>
                        <Text style={styles.rowUnit}>{unit}</Text>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
};

const Podium = ({ data, unit, loading, formatter, onPressUser, tabId }: any) => {
    if (loading) return <ActivityIndicator style={{ margin: 20 }} />;
    if (data.length === 0) return <Text style={styles.emptyText}>No data yet</Text>;

    const first = data[0];
    const second = data[1];
    const third = data[2];

    return (
        <View style={styles.podiumContainer}>
            <PodiumItem
                entry={second}
                rank={2}
                unit={unit}
                formatter={formatter}
                onPress={() => onPressUser(second)}
                tabId={tabId}
            />
            <PodiumItem
                entry={first}
                rank={1}
                unit={unit}
                formatter={formatter}
                onPress={() => onPressUser(first)}
                tabId={tabId}
            />
            <PodiumItem
                entry={third}
                rank={3}
                unit={unit}
                formatter={formatter}
                onPress={() => onPressUser(third)}
                tabId={tabId}
            />
        </View>
    );
};

const PodiumItem = ({ entry, rank, unit, formatter, onPress, tabId }: any) => {
    if (!entry) return <View style={styles.podiumCol} />;

    const barHeight = rank === 1 ? 100 : rank === 2 ? 75 : 50;
    const avatarSize = rank === 1 ? 60 : 48;
    const iconSize = rank === 1 ? 24 : 20;

    const color = rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : '#CD7C2F';
    const avatarUri = entry.avatarUrl ? { uri: entry.avatarUrl } : PLACEHOLDER_DEFAULT;
    const isGlobal = tabId === 'global';
    const isAdmire = tabId === 'admire';

    // [LOGIC MỚI] Nếu là tab admire thì lấy field admire
    const displayScore = isAdmire ? (entry.admire ?? 0) : (entry.score ?? 0);

    return (
        <TouchableOpacity style={styles.podiumCol} onPress={onPress} activeOpacity={0.8}>
            <View style={{ alignItems: 'center', marginBottom: 5 }}>
                <Icon name="emoji-events" size={iconSize} color={color} />
                <Image source={avatarUri} style={[styles.podiumAvatar, { borderColor: color, width: avatarSize, height: avatarSize }]} />
                <View style={[styles.podiumRankBadge, { backgroundColor: color }]}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{rank}</Text>
                </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{entry.fullname}</Text>

            {isGlobal ? (
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.podiumScore, { color: '#2563EB' }]}>Lv.{entry.level}</Text>
                    <Text style={styles.podiumUnit}>{entry.exp ? entry.exp.toLocaleString() : 0} exp</Text>
                </View>
            ) : (
                <Text style={[styles.podiumScore, { color }]}>
                    {formatter(displayScore)} {unit}
                </Text>
            )}

            <View style={{ width: '100%', height: barHeight, backgroundColor: color, opacity: 0.2, marginTop: 5, borderRadius: 4 }} />
        </TouchableOpacity>
    );
};

const Header = ({ tabs, selectedTab, onSelectTab, navigation }: any) => {
    const { t } = useTranslation();
    return (
        <View style={styles.headerContainer}>
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("home.leaderboard.title")}</Text>
                <View style={{ width: 24 }} />
            </View>
            <View style={styles.tabContainer}>
                {tabs.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => onSelectTab(item.id)}
                        style={[styles.tab, selectedTab === item.id && styles.tabActive]}
                    >
                        <Icon name={item.icon} size={16} color={selectedTab === item.id ? '#FFF' : '#666'} />
                        <Text style={[styles.tabText, selectedTab === item.id && styles.tabTextActive]} numberOfLines={1}>
                            {t(item.titleKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFF" },
    headerContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', paddingBottom: 10 },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        gap: 8,
        marginTop: 10,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    tabActive: { backgroundColor: '#3B82F6' },
    tabText: { marginLeft: 4, fontSize: 11, fontWeight: '600', color: '#666' },
    tabTextActive: { color: '#FFF' },
    podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingTop: 20, paddingBottom: 20, backgroundColor: '#FAFAFA' },
    podiumCol: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
    podiumAvatar: { borderWidth: 2, borderRadius: 50 },
    podiumRankBadge: { position: 'absolute', bottom: -5, paddingHorizontal: 5, borderRadius: 8 },
    podiumName: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 4, maxWidth: 80 },
    podiumScore: { fontSize: 11, fontWeight: 'bold' },
    podiumUnit: { fontSize: 10, color: '#666' },
    emptyText: { textAlign: 'center', padding: 20, color: '#999' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#F0F0F0' },
    rowMe: { backgroundColor: '#ECFDF5' },
    rowSticky: { backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#DDD', shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 5 },
    rankCol: { width: 30, alignItems: 'center' },
    rankText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    avatarCol: { width: 50, alignItems: 'center' },
    rowAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE' },
    flagIcon: { position: 'absolute', top: -2, left: 0 },
    infoCol: { flex: 1, paddingHorizontal: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: '#333' },
    rowSubtext: { fontSize: 12, color: '#999' },
    scoreCol: { alignItems: 'flex-end', minWidth: 60 },
    rowScore: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    rowUnit: { fontSize: 10, color: '#999' },
    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

export default EnhancedLeaderboardScreen;