import React, { useRef, useState, useEffect } from "react"
import {
    View,
    Text,
    Image,
    FlatList,
    Dimensions,
    TouchableOpacity,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { createScaledSheet } from "../../utils/scaledStyles"
import { gotoTab } from "../../utils/navigationRef"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// --- CÁC HẰNG SỐ ĐÃ ĐIỀU CHỈNH ĐỂ CĂN GIỮA VÀ THU NHỎ ITEM ---

// Khoảng cách giữa các item (GAP)
const ITEM_SPACING = 12

// Chiều rộng mong muốn của mỗi item.
// Ví dụ: Lấy 85% chiều rộng màn hình.
const ITEM_WIDTH = SCREEN_WIDTH * 0.85

// Khoảng cách LỀ (Padding) ở hai bên FlatList.
// Khoảng cách này được tính để item đầu tiên và item cuối cùng
// được căn giữa màn hình khi cuộn tới.
// Công thức: (SCREEN_WIDTH - ITEM_WIDTH) / 2 - ITEM_SPACING/2 (tùy thuộc vào cách bạn xử lý gap)
// Đơn giản hóa: Khoảng cách từ lề màn hình đến điểm bắt đầu của item đầu tiên
const SIDE_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2

// Khoảng cách CUỘN (SNAP) cho mỗi lần cuộn: là chiều rộng item + khoảng cách
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING

const CAROUSEL_DATA = [
    {
        id: "1",
        type: "FLASHSALE",
        title: "Flash Sale 50%",
        subtitle: "Get top rated courses now",
        color: "#4F46E5",
        icon: "flash-on",
    },
    {
        id: "2",
        type: "DEPOSIT",
        title: "Deposit Bonus",
        subtitle: "Get +20% extra coins",
        color: "#059669",
        icon: "account-balance-wallet",
    },
    {
        id: "3",
        type: "NEW",
        title: "New Courses",
        subtitle: "Explore Japanese N3",
        color: "#DB2777",
        icon: "new-releases",
    },
]

const HomeCarousel = ({ navigation }: any) => {
    const { t } = useTranslation()
    const flatListRef = useRef<FlatList>(null)
    const [activeIndex, setActiveIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            let nextIndex = activeIndex + 1
            if (nextIndex >= CAROUSEL_DATA.length) {
                nextIndex = 0
            }
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            })
            setActiveIndex(nextIndex)
        }, 5000)

        return () => clearInterval(interval)
    }, [activeIndex])

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x
        // Index được tính bằng cách lấy Offset cuộn, cộng với nửa khoảng cách cuộn, rồi chia cho khoảng cách cuộn
        // Công thức Center Snapping: Math.round( (offset + SIDE_PADDING) / SNAP_INTERVAL )
        // Tuy nhiên, do đã dùng `snapToAlignment="center"`, ta có thể sử dụng công thức đơn giản hơn
        // Index = (scrollOffset) / SNAP_INTERVAL
        const index = Math.round(scrollOffset / SNAP_INTERVAL)
        const clampedIndex = Math.max(0, Math.min(index, CAROUSEL_DATA.length - 1))
        setActiveIndex(clampedIndex)
    }

    const handlePress = (item: any) => {
        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
        }
    }

    const getItemLayout = (data: any, index: number) => {
        // Offset của item là: index * SNAP_INTERVAL - SIDE_PADDING (vì item đầu tiên phải bắt đầu ở -SIDE_PADDING để căn giữa)
        const offset = index * SNAP_INTERVAL
        return {
            length: ITEM_WIDTH,
            offset: offset,
            index,
        }
    }


    const renderItem = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: item.color }]}
            activeOpacity={0.9}
            onPress={() => handlePress(item)}
        >
            <View style={styles.textContainer}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t("common.hot")}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            <Icon name={item.icon} size={60} color="rgba(255,255,255,0.3)" style={styles.icon} />
            <View style={styles.arrowBtn}>
                <Icon name="arrow-forward" size={20} color={item.color} />
            </View>
        </TouchableOpacity>
    )

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={CAROUSEL_DATA}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                // Tắt pagingEnabled
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onMomentumScrollEnd={onMomentumScrollEnd}
                keyExtractor={(item) => item.id}
                // THAY ĐỔI QUAN TRỌNG:
                // 1. snapToInterval: Khoảng cách cuộn là ITEM_WIDTH + ITEM_SPACING
                snapToInterval={SNAP_INTERVAL}
                // 2. snapToAlignment: Căn chỉnh vào giữa (center)
                snapToAlignment="center"
            // 3. snapToOffsets: Bỏ qua thuộc tính này, dùng padding và interval.
            />
            <View style={styles.pagination}>
                {CAROUSEL_DATA.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === activeIndex ? styles.activeDot : styles.inactiveDot,
                        ]}
                    />
                ))}
            </View>
        </View>
    )
}

const styles = createScaledSheet({
    container: {
        marginVertical: 16,
    },
    listContent: {
        // THAY ĐỔI QUAN TRỌNG:
        // Căn chỉnh lề ngang bằng SIDE_PADDING để item đầu/cuối được căn giữa
        paddingHorizontal: SIDE_PADDING - (ITEM_SPACING / 2),
        // Sử dụng margin/gap cho các item giữa.
        // Căn giữa item đầu tiên sẽ cần padding khác nhau
        // Cách tốt nhất là dùng margin:
        gap: ITEM_SPACING,
        // Dùng paddingHorizontal với giá trị đã tính toán: SIDE_PADDING - (ITEM_SPACING / 2)
        // để tạo khoảng trống bù trừ.
    },
    card: {
        // THAY ĐỔI QUAN TRỌNG: Item nhỏ hơn
        width: ITEM_WIDTH,
        height: 140,
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
    },
    textContainer: {
        flex: 1,
        zIndex: 2,
    },
    badge: {
        backgroundColor: "rgba(0,0,0,0.2)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginBottom: 8,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    title: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 4,
    },
    subtitle: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 14,
    },
    icon: {
        position: "absolute",
        right: -10,
        bottom: -10,
        transform: [{ rotate: "-15deg" }],
    },
    arrowBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    pagination: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 10,
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        width: 20,
        backgroundColor: "#4F46E5",
    },
    inactiveDot: {
        width: 6,
        backgroundColor: "#E5E7EB",
    },
})

export default HomeCarousel