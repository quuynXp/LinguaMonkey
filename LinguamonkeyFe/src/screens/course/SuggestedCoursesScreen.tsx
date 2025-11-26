import React from 'react'
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { useCourses } from '../../hooks/useCourses'
import { useUserStore } from '../../stores/UserStore'
import { useTranslation } from 'react-i18next'
import { createScaledSheet } from '../../utils/scaledStyles'
import ScreenLayout from '../../components/layout/ScreenLayout'
import type { CourseResponse } from '../../types/dto'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { formatCurrency } from '../../utils/formatCurrency'

const SuggestedCoursesScreen = ({ navigation }: any) => {
    const { t } = useTranslation()
    const { user } = useUserStore()
    const userId = user?.userId

    const { data: coursesData, isLoading } = useCourses().useRecommendedCourses(userId, 10)

    const courses: CourseResponse[] = coursesData || []

    const renderCourse = ({ item }: { item: CourseResponse }) => {
        const version = item.latestPublicVersion
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('CourseDetailsScreen', { courseId: item.courseId })}
            >
                <Image source={{ uri: version?.thumbnailUrl }} style={styles.thumbnail} />
                <View style={styles.info}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.creator}>
                        {t('course.createdBy', { id: item.creatorId })}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>
                            {item.price === 0 ? t('course.free') : formatCurrency(item.price)}
                        </Text>
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{item.difficultyLevel}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <ScreenLayout> {/* FIXED: Removed 'title' prop to match inferred ScreenLayoutProps */}
            <View style={styles.container}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>{t("common.loadingData")}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={courses}
                        renderItem={renderCourse}
                        keyExtractor={(item) => item.courseId}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="sentiment-dissatisfied" size={48} color="#9CA3AF" />
                                <Text style={styles.emptyText}>{t('suggested.noCoursesFound')}</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    listContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#4F46E5",
    },
    card: {
        flexDirection: 'row',
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    thumbnail: {
        width: 100,
        height: 100,
        resizeMode: 'cover',
    },
    info: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    creator: {
        fontSize: 12,
        color: '#6B7280',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    levelBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 50,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: "#9CA3AF",
        marginTop: 10,
    },
})

export default SuggestedCoursesScreen;