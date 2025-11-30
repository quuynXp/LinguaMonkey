import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { useNotifications } from '../../hooks/useNotifications';
import { useUserStore } from '../../stores/UserStore';
import { getBadgeImage } from '../../utils/courseUtils';
import { gotoTab } from '../../utils/navigationRef';

const NotificationsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const [page, setPage] = useState(0);

    const {
        useNotificationsByUserId,
        useMarkAllRead,
        useDeleteAllNotifications,
        useMarkAsRead, // Use specific Hook
        useDeleteNotification
    } = useNotifications();

    const { data, isLoading, refetch, isRefetching } = useNotificationsByUserId(user?.userId, page, 50); // Increased page size
    const notifications = data?.data || [];

    const markAllMutation = useMarkAllRead();
    const deleteAllMutation = useDeleteAllNotifications();
    const markOneMutation = useMarkAsRead();
    const deleteMutation = useDeleteNotification();

    const handleMarkAllRead = () => {
        if (!user?.userId) return;
        markAllMutation.mutate(user.userId);
    };

    const handleDeleteAll = () => {
        Alert.alert(
            t('common.confirm'),
            t('notification.deleteAllConfirm') || "Delete all notifications?",
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => user?.userId && deleteAllMutation.mutate(user.userId)
                }
            ]
        );
    };

    const handleItemPress = (item: any) => {
        // 1. Mark as read using specific API
        if (!item.read && user?.userId) {
            markOneMutation.mutate({ id: item.notificationId, userId: user.userId });
        }

        // 2. Parse payload safely
        let payload: any = {};
        try {
            payload = item.payload ? JSON.parse(item.payload) : {};
        } catch (e) {
            console.log("Error parsing payload", e);
        }

        // 3. Navigate logic based on Type
        switch (item.type) {
            case 'SYSTEM_TEST':
                // FIX: Check sessionId before navigating
                if (payload.sessionId) {
                    navigation.navigate('TestSessionScreen', { sessionId: payload.sessionId });
                } else {
                    console.warn("SYSTEM_TEST notification missing sessionId in payload");
                    // Optional: Navigate to general test screen or do nothing
                }
                break;

            case 'COURSE_UPDATE':
            case 'COURSE_PURCHASE':
                if (payload.courseId) {
                    navigation.navigate('CourseStack', {
                        screen: 'CourseDetail',
                        params: { courseId: payload.courseId }
                    });
                } else {
                    navigation.navigate('CourseStack');
                }
                break;

            case 'VIP_EXTENDED':
            case 'VIP_ACTIVATED':
            case 'VIP_EXPIRATION_WARNING':
                navigation.navigate('PaymentStack');
                break;

            case 'ACHIEVEMENT':
            case 'BADGE_UNLOCKED':
            case 'FRIEND_REQUEST':
            case 'ADMIRE':
                navigation.navigate('ProfileStack');
                break;

            case 'DAILY_CHALLENGE_SUGGESTION':
            case 'DAILY_REMINDER':
            case 'STREAK_REMINDER':
                gotoTab('Home');
                break;

            case 'MESSAGE':
                gotoTab('Chat');
                break;

            default:
                // Fallback using 'screen' from payload if available
                if (payload.screen) {
                    try {
                        // Check if screen needs params
                        navigation.navigate(payload.screen, payload);
                    } catch (err) {
                        console.log("Navigation failed for generic payload", err);
                    }
                }
                break;
        }
    };

    const handleDeleteItem = (id: string) => {
        if (!user?.userId) return;
        deleteMutation.mutate({ id, userId: user.userId });
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'VIP_EXTENDED':
            case 'VIP_ACTIVATED': return 'diamond';
            case 'COURSE_PURCHASE': return 'shopping-bag';
            case 'ACHIEVEMENT': return 'emoji-events';
            case 'DAILY_REMINDER': return 'alarm';
            case 'MESSAGE': return 'chat';
            case 'FRIEND_REQUEST': return 'person-add';
            case 'SYSTEM_TEST': return 'assignment';
            default: return 'notifications';
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isRead = item.read;
        const imageSource = getBadgeImage(null);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, !isRead && styles.unreadItem]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.iconContainer}>
                    <Image source={imageSource} style={styles.itemImage} />
                    <View style={styles.typeIconBadge}>
                        <Icon name={getIconForType(item.type)} size={12} color="#FFF" />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.itemTitle, !isRead && styles.boldTitle]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.itemContent} numberOfLines={2}>
                        {item.content}
                    </Text>
                    <Text style={styles.itemTime}>
                        {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {!isRead && <View style={styles.unreadDot} />}

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.notificationId)}>
                    <Icon name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout backgroundColor="#F8FAFC">
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
                    <Icon name="done-all" size={20} color="#3B82F6" />
                    {/* Hardcode fallback to fix missing key warning */}
                    <Text style={styles.actionText}>{t('notification.readAll') === 'notification.readAll' ? "Read All" : t('notification.readAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteAll} style={styles.actionBtn}>
                    <Icon name="delete-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#3B82F6" size="large" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="notifications-none" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>{t('notification.empty') || "No notifications"}</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.notificationId}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                />
            )}
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadItem: {
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    iconContainer: {
        position: 'relative',
        marginRight: 12,
    },
    itemImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
    },
    typeIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#3B82F6',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 15,
        color: '#1F2937',
        marginBottom: 2,
    },
    boldTitle: {
        fontWeight: '700',
    },
    itemContent: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    itemTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginLeft: 8,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9CA3AF',
    },
});

export default NotificationsScreen;