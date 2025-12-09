import React, { useState } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    TextInput,
    Modal,
    ScrollView,
    ListRenderItem
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useCourses } from "../../hooks/useCourses"
import { getCourseImage } from "../../utils/courseUtils"
import { CourseResponse } from "../../types/dto"

const SpecialOfferScreen = ({ navigation }: any) => {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState("ALL")

    const [searchQuery, setSearchQuery] = useState("")
    const [filterModalVisible, setFilterModalVisible] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined)
    const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined)

    const { useSpecialOffers } = useCourses()

    const { data, refetch, isRefetching, isLoading } = useSpecialOffers({
        keyword: searchQuery,
        languageCode: selectedLanguage,
        minRating: selectedRating,
        page: 0,
        size: 20
    })

    const courses = (data?.data || []) as CourseResponse[]

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Icon name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("offer.title")}</Text>
            <View style={{ width: 40 }} />
        </View>
    )

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
                <Icon name="search" size={24} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t("offer.searchPlaceholder")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    onSubmitEditing={() => refetch()}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Icon name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity
                style={[styles.filterBtn, (selectedLanguage || selectedRating) && styles.filterBtnActive]}
                onPress={() => setFilterModalVisible(true)}
            >
                <Icon name="tune" size={24} color={selectedLanguage || selectedRating ? "#FFF" : "#4B5563"} />
            </TouchableOpacity>
        </View>
    )

    const renderRatingStars = (rating: number = 0) => {
        return (
            <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                        key={star}
                        name={star <= Math.round(rating) ? "star" : "star-border"}
                        size={14}
                        color="#F59E0B"
                    />
                ))}
            </View>
        )
    }

    const renderCourseCard: ListRenderItem<CourseResponse> = ({ item }) => {
        // Fix: Use Active discount and latest version fields for display
        const discount = item.activeDiscountPercentage || 0
        const version = item.latestPublicVersion
        const oldPrice = version?.price || 0
        const newPrice = item.discountedPrice || (oldPrice * (100 - discount) / 100)

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("CourseDetailsScreen", { courseId: item.courseId })}
            >
                <View style={styles.imageContainer}>
                    <Image source={getCourseImage(version?.thumbnailUrl)} style={styles.cardImage} />
                    {discount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>-{discount}%</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.topRow}>
                        <Text style={styles.langTag}>{version?.languageCode || 'EN'}</Text>
                        <View style={styles.ratingRow}>
                            {renderRatingStars(version?.systemRating || 5)}
                            <Text style={styles.ratingText}>({item.reviewCount || 0})</Text>
                        </View>
                    </View>

                    <Text numberOfLines={2} style={styles.courseTitle}>
                        {item.title}
                    </Text>

                    <View style={styles.creatorRow}>
                        <Image
                            source={{ uri: item.creatorAvatar || "https://ui-avatars.com/api/?name=" + item.creatorName }}
                            style={styles.creatorAvatar}
                        />
                        <Text numberOfLines={1} style={styles.creatorName}>{item.creatorName}</Text>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.newPrice}>${Number(newPrice).toFixed(2)}</Text>
                        {discount > 0 && (
                            <Text style={styles.oldPrice}>${Number(oldPrice).toFixed(2)}</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    const renderFilterModal = () => (
        <Modal
            visible={filterModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFilterModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t("offer.filter.title")}</Text>
                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Icon name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <Text style={styles.filterLabel}>{t("offer.filter.rating")}</Text>
                        <View style={styles.chipContainer}>
                            {[5, 4, 3, 2, 1].map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.chip, selectedRating === r && styles.chipSelected]}
                                    onPress={() => setSelectedRating(selectedRating === r ? undefined : r)}
                                >
                                    <Text style={[styles.chipText, selectedRating === r && styles.chipTextSelected]}>
                                        {r} {t("common.stars")} & Up
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterLabel}>{t("offer.filter.language")}</Text>
                        <View style={styles.chipContainer}>
                            {["EN", "VN", "CN", "JP", "KR"].map(lang => (
                                <TouchableOpacity
                                    key={lang}
                                    style={[styles.chip, selectedLanguage === lang && styles.chipSelected]}
                                    onPress={() => setSelectedLanguage(selectedLanguage === lang ? undefined : lang)}
                                >
                                    <Text style={[styles.chipText, selectedLanguage === lang && styles.chipTextSelected]}>
                                        {lang}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => {
                                setSelectedRating(undefined)
                                setSelectedLanguage(undefined)
                            }}
                        >
                            <Text style={styles.resetBtnText}>{t("common.reset")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => {
                                setFilterModalVisible(false)
                                refetch()
                            }}
                        >
                            <Text style={styles.applyBtnText}>{t("common.apply")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )

    return (
        <ScreenLayout>
            {renderHeader()}
            {renderSearchBar()}

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === "ALL" && styles.activeTab]}>
                    <Text style={[styles.tabText, activeTab === "ALL" && styles.activeTabText]}>
                        {t("offer.tab.all")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} disabled>
                    <Text style={[styles.tabText, { opacity: 0.5 }]}>{t("offer.tab.flash")}</Text>
                </TouchableOpacity>
            </View>

            {isLoading && !isRefetching ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
            ) : (
                <FlatList<CourseResponse>
                    data={courses}
                    renderItem={renderCourseCard}
                    keyExtractor={(item) => item.courseId}
                    contentContainerStyle={styles.list}
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="search-off" size={60} color="#E5E7EB" />
                            <Text style={styles.emptyText}>{t("offer.noResults")}</Text>
                        </View>
                    }
                />
            )}

            {renderFilterModal()}
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFF',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    backBtn: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: '#FFF',
        gap: 12,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtnActive: {
        backgroundColor: '#4F46E5',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFF',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#4F46E5',
    },
    tabText: {
        color: '#6B7280',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#4F46E5',
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        height: 180,
        width: '100%',
        backgroundColor: '#E5E7EB',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#DC2626',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cardContent: {
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    langTag: {
        fontSize: 12,
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: '600',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#6B7280',
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 22,
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    creatorAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: '#E5E7EB',
    },
    creatorName: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    newPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    oldPrice: {
        fontSize: 14,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalBody: {
        padding: 16,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4F46E5',
    },
    chipText: {
        color: '#4B5563',
        fontSize: 14,
    },
    chipTextSelected: {
        color: '#4F46E5',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 12,
    },
    resetBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    resetBtnText: {
        color: '#374151',
        fontWeight: '600',
    },
    applyBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#4F46E5',
    },
    applyBtnText: {
        color: '#FFF',
        fontWeight: '600',
    },
})

export default SpecialOfferScreen