import React, { useState } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Modal,
    Image,
    Alert,
    TextInput,
    ActivityIndicator,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import { getCourseImage } from "../../utils/courseUtils"
import Slider from "@react-native-community/slider"

const SpecialOfferScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation()
    const { user } = useUserStore()
    const [activeTab, setActiveTab] = useState("ALL") // ALL, FLASH, P2P
    const [createModalVisible, setCreateModalVisible] = useState(false)

    // Create Discount State
    const [selectedCourse, setSelectedCourse] = useState<any>(null)
    const [discountPercent, setDiscountPercent] = useState(10)
    const [customCode, setCustomCode] = useState("")

    const {
        useDiscounts,
        useCreatorCourses,
        useCreateDiscount
    } = useCourses()

    const { data: discountsData, isLoading } = useDiscounts({ size: 50 })
    const { data: myCoursesData } = useCreatorCourses(user?.userId)
    const createDiscountMutation = useCreateDiscount()

    const discounts = discountsData?.data || []
    const myCourses = myCoursesData?.data || []

    const handleCreateDiscount = () => {
        if (!selectedCourse) {
            Alert.alert(t("error"), t("offer.selectCourseRequired"))
            return
        }

        createDiscountMutation.mutate({
            courseId: selectedCourse.courseId,
            code: customCode || `SALE${discountPercent}`,
            discountPercentage: discountPercent,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            isActive: true
        }, {
            onSuccess: () => {
                setCreateModalVisible(false)
                Alert.alert(t("success"), t("offer.createSuccess"))
                setSelectedCourse(null)
                setDiscountPercent(10)
                setCustomCode("")
            },
            onError: () => Alert.alert(t("error"), t("offer.createFailed"))
        })
    }

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Icon name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("offer.title")}</Text>
            <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCreateModalVisible(true)}
            >
                <Icon name="add" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    )

    const renderDiscountItem = ({ item }: any) => {
        // Assuming item contains course info or we fetch it. 
        // For this snippet, we assume the discount object has basic course details mapped or joined.
        // If pure discount object, we'd need to fetch course details.
        // Simulating structure: item.courseId, item.discountPercentage, item.code

        return (
            <TouchableOpacity
                style={styles.offerCard}
                onPress={() => navigation.navigate("CourseDetailsScreen", { courseId: item.courseId })}
            >
                <View style={styles.offerBadge}>
                    <Text style={styles.offerBadgeText}>-{item.discountPercentage}%</Text>
                </View>
                <View style={styles.offerContent}>
                    <View style={styles.iconContainer}>
                        <Icon name="local-offer" size={24} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.offerTitle}>{item.code}</Text>
                        <Text style={styles.offerSub}>{t("offer.expiresIn7Days")}</Text>
                    </View>
                    <View style={styles.actionArrow}>
                        <Icon name="chevron-right" size={24} color="#9CA3AF" />
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <ScreenLayout>
            {renderHeader()}

            <View style={styles.tabs}>
                {["ALL", "FLASH", "P2P"].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {t(`offer.tab.${tab.toLowerCase()}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={discounts}
                    renderItem={renderDiscountItem}
                    keyExtractor={(item: any) => item.discountId}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="campaign" size={60} color="#E5E7EB" />
                            <Text style={styles.emptyText}>{t("offer.noActiveOffers")}</Text>
                        </View>
                    }
                />
            )}

            <Modal
                visible={createModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("offer.createDiscount")}</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody}>
                            <Text style={styles.label}>{t("offer.selectCourse")}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseSelectScroll}>
                                {myCourses.map((c: any) => (
                                    <TouchableOpacity
                                        key={c.courseId}
                                        style={[
                                            styles.courseOption,
                                            selectedCourse?.courseId === c.courseId && styles.courseOptionSelected
                                        ]}
                                        onPress={() => setSelectedCourse(c)}
                                    >
                                        <Image source={getCourseImage(c.thumbnailUrl)} style={styles.courseThumb} />
                                        <Text numberOfLines={1} style={styles.courseOptionTitle}>{c.title}</Text>
                                        <Text style={styles.coursePrice}>${c.price}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedCourse && (
                                <>
                                    <Text style={styles.label}>
                                        {t("offer.discountPercent")}: <Text style={{ color: '#4F46E5' }}>{discountPercent}%</Text>
                                    </Text>
                                    <View style={styles.sliderContainer}>
                                        <Slider
                                            style={{ width: '100%', height: 40 }}
                                            minimumValue={1}
                                            maximumValue={99}
                                            step={1}
                                            value={discountPercent}
                                            onValueChange={setDiscountPercent}
                                            minimumTrackTintColor="#4F46E5"
                                            maximumTrackTintColor="#E5E7EB"
                                            thumbTintColor="#4F46E5"
                                        />
                                        <View style={styles.sliderLabels}>
                                            <Text style={styles.sliderLabel}>1%</Text>
                                            <Text style={styles.sliderLabel}>99%</Text>
                                        </View>
                                    </View>

                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>{t("offer.newPrice")}:</Text>
                                        <Text style={styles.previewOldPrice}>${selectedCourse.price}</Text>
                                        <Icon name="arrow-right-alt" size={20} color="#6B7280" />
                                        <Text style={styles.previewNewPrice}>
                                            ${(selectedCourse.price * (100 - discountPercent) / 100).toFixed(2)}
                                        </Text>
                                    </View>

                                    <Text style={styles.label}>{t("offer.customCode")} ({t("common.optional")})</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="MYCOURSE2025"
                                        value={customCode}
                                        onChangeText={setCustomCode}
                                        autoCapitalize="characters"
                                    />
                                    <Text style={styles.helperText}>{t("offer.customCodeHelper")}</Text>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, !selectedCourse && styles.disabledBtn]}
                                disabled={!selectedCourse || createDiscountMutation.isPending}
                                onPress={handleCreateDiscount}
                            >
                                {createDiscountMutation.isPending ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>{t("offer.createButton")}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    createBtn: {
        backgroundColor: '#4F46E5',
        padding: 8,
        borderRadius: 8,
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
    offerCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    offerBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 8,
    },
    offerBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    offerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
    },
    offerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    offerSub: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    actionArrow: {
        marginLeft: 8,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#9CA3AF',
        marginTop: 12,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalBody: {
        padding: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 8,
    },
    courseSelectScroll: {
        marginBottom: 20,
    },
    courseOption: {
        width: 140,
        padding: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginRight: 12,
        backgroundColor: '#F9FAFB',
    },
    courseOptionSelected: {
        borderColor: '#4F46E5',
        backgroundColor: '#EEF2FF',
    },
    courseThumb: {
        width: '100%',
        height: 80,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#E5E7EB',
    },
    courseOptionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    coursePrice: {
        color: '#059669',
        fontWeight: 'bold',
    },
    sliderContainer: {
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
    },
    previewLabel: {
        fontSize: 14,
        color: '#166534',
        fontWeight: '500',
    },
    previewOldPrice: {
        fontSize: 14,
        color: '#6B7280',
        textDecorationLine: 'line-through',
    },
    previewNewPrice: {
        fontSize: 18,
        color: '#166534',
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    helperText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 6,
        fontStyle: 'italic',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    confirmBtn: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: '#A5B4FC',
    },
    confirmBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
})

export default SpecialOfferScreen