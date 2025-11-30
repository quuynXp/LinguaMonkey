import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { createScaledSheet } from '../../utils/scaledStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useUserStore } from '../../stores/UserStore';
import { useDailyChallenges, useClaimChallengeReward } from '../../hooks/useDailyChallenge';
import { useBadgeProgress, useClaimBadge } from '../../hooks/useBadge';
import { UserDailyChallengeResponse, BadgeProgressResponse } from '../../types/dto';
import { gotoTab } from '../../utils/navigationRef';
import { getBadgeImage } from '../../utils/courseUtils'; // Sử dụng đúng util

type TabType = 'DAILY' | 'WEEKLY' | 'BADGE';

const DailyChallengeBadgeScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const initialTab = route?.params?.initialTab || 'DAILY';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Local state optimistic UI
    const [claimedItems, setClaimedItems] = useState<Set<string>>(new Set());

    const { user } = useUserStore();
    const userId = user?.userId;

    const { data: challenges, isLoading: loadingChallenges, refetch: refetchChallenges } = useDailyChallenges(userId);
    const { data: badges, isLoading: loadingBadges, refetch: refetchBadges } = useBadgeProgress(userId);

    const { claimReward, isClaiming: isClaimingChallenge } = useClaimChallengeReward();
    const { claimBadge, isClaiming: isClaimingBadge } = useClaimBadge();

    // --- SORTING LOGIC ---
    // CAN_CLAIM (1) -> IN_PROGRESS (2) -> CLAIMED/COMPLETED (3)
    const getSortWeight = (item: UserDailyChallengeResponse) => {
        const isLocallyClaimed = claimedItems.has(item.challengeId);
        // Nếu API trả về CLAIMED hoặc User vừa bấm Claim -> Weight 3 (Đáy)
        if (item.status === 'CLAIMED' || isLocallyClaimed) return 3;
        // Nếu được nhận thưởng -> Weight 1 (Đỉnh)
        if (item.status === 'CAN_CLAIM') return 1;
        // Còn lại -> Weight 2
        return 2;
    };

    const dailyTasks = useMemo(() => {
        const list = challenges?.filter((c: UserDailyChallengeResponse) => c.period === 'DAILY') || [];
        return [...list].sort((a, b) => getSortWeight(a) - getSortWeight(b));
    }, [challenges, claimedItems]);

    const weeklyTasks = useMemo(() => {
        const list = challenges?.filter((c: UserDailyChallengeResponse) => c.period === 'WEEKLY') || [];
        return [...list].sort((a, b) => getSortWeight(a) - getSortWeight(b));
    }, [challenges, claimedItems]);

    const onClaimSuccess = (id: string) => {
        setClaimedItems(prev => new Set(prev).add(id));
    }

    const handleClaimChallenge = async (challengeId: string) => {
        if (!userId || claimedItems.has(challengeId)) return;
        try {
            onClaimSuccess(challengeId);
            await claimReward({ userId, challengeId });
            refetchChallenges();
        } catch (error) {
            console.error("Claim challenge failed", error);
        }
    };

    const handleClaimBadge = async (badgeId: string) => {
        if (!userId || claimedItems.has(badgeId)) return;
        try {
            onClaimSuccess(badgeId);
            await claimBadge({ userId, badgeId });
            refetchBadges();
        } catch (error) {
            console.error("Claim badge failed", error);
        }
    };

    const handleNavigate = (screenRoute?: string) => {
        if (screenRoute) {
            try { navigation.navigate(screenRoute); } catch (e) { gotoTab(screenRoute); }
        }
    };

    // --- RENDER CHALLENGE ---
    const renderChallengeItem = (item: UserDailyChallengeResponse) => {
        const isLocallyClaimed = claimedItems.has(item.challengeId);
        // Đã hoàn thành nếu status BE là CLAIMED hoặc vừa bấm claim
        const isFinished = item.status === 'CLAIMED' || isLocallyClaimed;

        // Nút claim chỉ hiện khi BE báo CAN_CLAIM và chưa bấm claim
        const canClaim = item.status === 'CAN_CLAIM' && !isLocallyClaimed;

        const progressPercent = Math.min(100, Math.max(0, (item.progress / (item.targetAmount || 1)) * 100));

        return (
            <TouchableOpacity
                key={item.challengeId}
                // Thêm style grayscale/opacity nếu đã xong
                style={[
                    styles.taskCard,
                    isFinished && styles.taskCardGrayedOut // Style mới cho trạng thái chìm/xám
                ]}
                onPress={() => !isFinished && !canClaim && handleNavigate(item.screenRoute)}
                activeOpacity={0.9}
                disabled={isFinished} // Disable touch nếu đã xong
            >
                <View style={[styles.taskIconContainer, isFinished && styles.grayscale]}>
                    <Icon name={isFinished ? "check-circle" : "flag"} size={28} color={isFinished ? "#6B7280" : "#F59E0B"} />
                </View>

                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, isFinished && styles.textGray]}>{item.title}</Text>
                    <Text style={[styles.taskDesc, isFinished && styles.textGray]}>{item.description}</Text>

                    <View style={styles.progressBarBg}>
                        <View style={[
                            styles.progressBarFill,
                            {
                                width: `${progressPercent}%`,
                                backgroundColor: isFinished ? '#9CA3AF' : (canClaim ? '#10B981' : '#3B82F6') // Xám nếu xong, Xanh lá nếu đc nhận, Xanh dương đang làm
                            }
                        ]} />
                    </View>
                    <Text style={styles.progressText}>{item.progress} / {item.targetAmount}</Text>
                </View>

                <View style={styles.taskAction}>
                    {canClaim ? (
                        <TouchableOpacity
                            style={styles.claimButton}
                            onPress={() => handleClaimChallenge(item.challengeId)}
                            disabled={isClaimingChallenge || isLocallyClaimed}
                        >
                            {isClaimingChallenge ? <ActivityIndicator color="#FFF" size="small" /> : (
                                <>
                                    <Text style={styles.claimText}>{t('common.claim')}</Text>
                                    <View style={styles.rewardBadge}>
                                        <Icon name="monetization-on" size={12} color="#FEF3C7" />
                                        <Text style={styles.rewardText}>+{item.rewardCoins}</Text>
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : isFinished ? (
                        <View style={styles.completedBadgeGray}>
                            <Text style={styles.completedTextGray}>{t('common.received')}</Text>
                        </View>
                    ) : (
                        <View style={styles.rewardPreview}>
                            <Icon name="bolt" size={16} color="#F59E0B" />
                            <Text style={styles.xpText}>+{item.expReward} XP</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // --- RENDER BADGE ---
    const renderBadgeItem = (item: BadgeProgressResponse) => {
        const isLocallyClaimed = claimedItems.has(item.badgeId);

        // Logic Owned: Backend báo isAchieved (đã có trong UserBadge) HOẶC vừa bấm claim
        const isOwned = item.isAchieved || isLocallyClaimed;

        // Logic Claim: Chưa owned VÀ đủ điểm
        const canClaim = !isOwned && (item.currentUserProgress >= item.criteriaThreshold);

        const isLocked = !isOwned && !canClaim;

        const progressPercent = Math.min(100, Math.max(0, (item.currentUserProgress / item.criteriaThreshold) * 100));

        // Dùng Utils để lấy ảnh (Fallback image)
        const badgeImageSource = getBadgeImage(item.imageUrl);

        return (
            <View key={item.badgeId} style={styles.badgeItemContainer}>
                <View style={[styles.badgeIconWrapper, isLocked && styles.grayscale]}>
                    <Image source={badgeImageSource} style={styles.badgeImage} />
                    {isLocked && (
                        <View style={styles.lockOverlay}>
                            <Icon name="lock" size={24} color="#FFF" />
                        </View>
                    )}
                </View>

                <Text style={styles.badgeName} numberOfLines={1}>{item.badgeName}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>

                {/* Chỉ hiện progress bar nếu chưa sở hữu */}
                {!isOwned && (
                    <View style={styles.badgeProgressContainer}>
                        <View style={styles.badgeProgressBarBg}>
                            <View style={[styles.badgeProgressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.badgeProgressText}>{item.currentUserProgress}/{item.criteriaThreshold}</Text>
                    </View>
                )}

                {/* BUTTON LOGIC */}
                {canClaim ? (
                    <TouchableOpacity
                        style={styles.badgeClaimBtn}
                        onPress={() => handleClaimBadge(item.badgeId)}
                        disabled={isClaimingBadge || isLocallyClaimed}
                    >
                        <Text style={styles.claimTextSmall}>{t('common.claim')}</Text>
                    </TouchableOpacity>
                ) : isOwned ? (
                    // Nếu đã sở hữu (UserBadge exist) -> Hiển thị Owned, KHÔNG hiện nút claim
                    <View style={styles.ownedLabel}>
                        <Icon name="verified" size={14} color="#10B981" />
                        <Text style={styles.ownedText}>{t('common.owned')}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    const renderContent = () => {
        if (activeTab === 'BADGE') {
            if (loadingBadges) return <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />;
            return (
                <ScrollView contentContainerStyle={styles.badgeGrid} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loadingBadges} onRefresh={refetchBadges} />}>
                    {(badges || []).map((b: BadgeProgressResponse) => renderBadgeItem(b))}
                </ScrollView>
            );
        }

        const data = activeTab === 'DAILY' ? dailyTasks : weeklyTasks;
        if (loadingChallenges && !data.length) return <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />;

        return (
            <ScrollView contentContainerStyle={styles.taskList} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loadingChallenges} onRefresh={refetchChallenges} />}>
                {data.length === 0 ? (
                    <View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('home.challenge.noTasks')}</Text></View>
                ) : (
                    data.map(renderChallengeItem)
                )}
            </ScrollView>
        );
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    {['DAILY', 'WEEKLY', 'BADGE'].map((tab) => (
                        <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab as TabType)}>
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{t(`challenge.tab.${tab.toLowerCase()}`)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.contentContainer}>{renderContent()}</View>
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1 },
    tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', margin: 16, borderRadius: 12, padding: 4, elevation: 2 },
    tabButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: '#EEF2FF' },
    tabText: { fontWeight: '600', color: '#6B7280', fontSize: 13 },
    tabTextActive: { color: '#4F46E5', fontWeight: '700' },
    contentContainer: { flex: 1, paddingHorizontal: 16 },
    taskList: { paddingBottom: 20 },

    // Task Card Normal
    taskCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },

    // Task Card Grayed Out (Mới)
    taskCardGrayedOut: { backgroundColor: '#F3F4F6', opacity: 0.8 },
    textGray: { color: '#9CA3AF' },

    taskIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    taskContent: { flex: 1, marginRight: 8 },
    taskTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    taskDesc: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
    progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 4 },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 10, color: '#9CA3AF', textAlign: 'right' },
    taskAction: { justifyContent: 'center', alignItems: 'center', minWidth: 70 },
    claimButton: { backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
    claimText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    rewardBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    rewardText: { color: '#FEF3C7', fontSize: 10, fontWeight: 'bold', marginLeft: 2 },

    // Completed Styles
    completedBadge: { backgroundColor: '#D1FAE5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    completedText: { color: '#065F46', fontSize: 12, fontWeight: '600' },

    // Completed Gray Styles (Mới)
    completedBadgeGray: { backgroundColor: '#E5E7EB', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    completedTextGray: { color: '#6B7280', fontSize: 12, fontWeight: '600' },

    rewardPreview: { alignItems: 'center' },
    xpText: { fontSize: 12, fontWeight: '700', color: '#F59E0B', marginTop: 2 },

    // Badge Styles
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 },
    badgeItemContainer: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', elevation: 1 },
    badgeIconWrapper: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, overflow: 'hidden', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    badgeImage: { width: 70, height: 70, resizeMode: 'contain' },

    grayscale: { backgroundColor: '#E5E7EB', opacity: 0.6 }, // Dùng chung cho cả Icon và Badge

    lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderRadius: 40 },
    badgeName: { fontSize: 14, fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: 4 },
    badgeDesc: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginBottom: 12, height: 32 },
    badgeClaimBtn: { backgroundColor: '#F59E0B', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginTop: 4 },
    claimTextSmall: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    ownedLabel: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ownedText: { fontSize: 11, color: '#10B981', fontWeight: '600', marginLeft: 4 },
    badgeProgressContainer: { width: '100%', marginTop: 4, marginBottom: 4 },
    badgeProgressBarBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
    badgeProgressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 2 },
    badgeProgressText: { fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
    emptyContainer: { padding: 20, alignItems: 'center' },
    emptyText: { color: '#6B7280', fontSize: 14 }
});

export default DailyChallengeBadgeScreen;