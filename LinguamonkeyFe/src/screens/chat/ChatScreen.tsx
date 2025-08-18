import React, { useRef } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
const ChatScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const chatOptions = [
        {
            id: 'ai-chat',
            title: 'Trò chuyện với AI',
            subtitle: 'Luyện tập với trợ lý AI thông minh',
            icon: 'smart-toy',
            color: '#4F46E5',
            animation: require('../../assets/animations/ai-chat.json'),
            onPress: () => navigation.navigate('ChatAI'),
        },
        {
            id: 'user-chat',
            title: 'Trò chuyện với người dùng',
            subtitle: 'Kết nối với người học khác',
            icon: 'group',
            color: '#10B981',
            animation: require('../../assets/animations/user-chat.json'),
            onPress: () => navigation.navigate('UserChat'),
        },
    ];

    const quickActions = [
        {
            id: "video-call",
            title: "Gọi video",
            icon: "videocam",
            color: "#EF4444",
            onPress: () => navigation.navigate("CallSetup"),
        },
        {
            id: "join-room",
            title: "Tham gia phòng",
            icon: "meeting-room",
            color: "#F59E0B",
            onPress: () => navigation.navigate("ChatRoomList"),
        },
        {
            id: "create-room",
            title: "Tạo phòng mới",
            icon: "add-circle",
            color: "#EF4444",
            onPress: () => navigation.navigate("CreateRoom"),
        },
        {
            id: "chat-settings",
            title: "Cài đặt chat",
            icon: "settings",
            color: "#8B5CF6",
            onPress: () => navigation.navigate("ChatSettings"),
        },
    ]


    const renderChatOption = (option) => (
        <TouchableOpacity
            key={option.id}
            style={styles.chatOption}
            onPress={option.onPress}
        >
            <View style={styles.chatOptionContent}>
                <View style={[styles.chatIconContainer, { backgroundColor: `${option.color}20` }]}>
                    <Icon name={option.icon} size={40} color={option.color} style={styles.chatAnimation} />
                </View>
                <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle}>{option.title}</Text>
                    <Text style={styles.chatSubtitle}>{option.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );

    const renderQuickAction = (action) => (
        <TouchableOpacity
            key={action.id}
            style={styles.quickAction}
            onPress={action.onPress}
        >
            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Icon name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.quickActionText}>{action.title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Trò chuyện</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('ChatSettings')}
                >
                    <Icon name="settings" size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View
                    style={[
                        styles.scrollContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Welcome Section */}
                    <View style={styles.welcomeSection}>
                        <Icon name="chat" size={120} color="#4F46E5" style={styles.welcomeAnimation} />
                        <Text style={styles.welcomeTitle}>Chào mừng đến với Chat!</Text>
                        <Text style={styles.welcomeText}>
                            Luyện tập ngôn ngữ thông qua trò chuyện với AI hoặc kết nối với người học khác
                        </Text>
                    </View>

                    {/* Chat Options */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Chọn loại trò chuyện</Text>
                        {chatOptions.map(renderChatOption)}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
                        <View style={styles.quickActionsGrid}>
                            {quickActions.map(renderQuickAction)}
                        </View>
                    </View>

                    {/* Recent Activity */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
                        <View style={styles.activityCard}>
                            <View style={styles.activityItem}>
                                <View style={styles.activityIcon}>
                                    <Icon name="smart-toy" size={20} color="#4F46E5" />
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={styles.activityTitle}>Chat với AI</Text>
                                    <Text style={styles.activityTime}>2 giờ trước</Text>
                                </View>
                            </View>
                            <View style={styles.activityItem}>
                                <View style={styles.activityIcon}>
                                    <Icon name="group" size={20} color="#10B981" />
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={styles.activityTitle}>Phòng "Học tiếng Anh"</Text>
                                    <Text style={styles.activityTime}>1 ngày trước</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Tips */}
                    <View style={styles.tipsSection}>
                        <View style={styles.tipsHeader}>
                            <Icon name="lightbulb" size={20} color="#F59E0B" />
                            <Text style={styles.tipsTitle}>Mẹo sử dụng</Text>
                        </View>
                        <Text style={styles.tipsText}>
                            💡 Sử dụng tính năng dịch tự động để hiểu tin nhắn từ người dùng khác{'\n'}
                            🎯 Tham gia phòng chat phù hợp với trình độ của bạn{'\n'}
                            🤖 Chat với AI để luyện tập hội thoại mọi lúc
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    settingsButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    welcomeAnimation: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    chatOption: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chatOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    chatIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    chatAnimation: {
        width: 40,
        height: 40,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    chatSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickAction: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '30%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    quickActionText: {
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        fontWeight: '500',
    },
    activityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    activityTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    tipsSection: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400E',
        marginLeft: 8,
    },
    tipsText: {
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
});

export default ChatScreen;