import React, { useRef, useState, useEffect, useMemo } from "react"
import {
    View,
    FlatList,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Animated,
} from "react-native"
import { useTranslation } from "react-i18next"
import { createScaledSheet } from "../../utils/scaledStyles"
import { gotoTab } from "../../utils/navigationRef"
import HomeCarouselItem from "./HomeCarouselItem"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// --- CÁC HẰNG SỐ ĐÃ ĐIỀU CHỈNH ĐỂ CĂN GIỮA VÀ THU NHỎ ITEM ---

// Khoảng cách giữa các item (GAP)
export const ITEM_SPACING = 20
// Chiều rộng mong muốn của mỗi item (85% màn hình)
export const ITEM_WIDTH = SCREEN_WIDTH * 0.85
// LỀ cố định trái/phải (padding 10)
const FIXED_PADDING = 10
// Khoảng cách CUỘN (SNAP) cho mỗi lần cuộn: là chiều rộng item + khoảng cách
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING

// Dữ liệu gốc
const CAROUSEL_DATA_MOCK = [
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

// Số lượng bản sao (clone) cần thiết để tạo hiệu ứng vô hạn
const CLONE_COUNT = CAROUSEL_DATA_MOCK.length

const HomeCarousel = ({ navigation }: any) => {
    const { t } = useTranslation()
    const flatListRef = useRef<FlatList>(null)
    const [scrolling, setScrolling] = useState(false)

    // Dùng Animated.Value để theo dõi cuộn và truyền vào item con
    const scrollX = useRef(new Animated.Value(0)).current
    // Dùng useRef để lưu trữ giá trị offset hiện tại cho logic tự động cuộn
    const currentScrollOffset = useRef(0)
    const [currentIndex, setCurrentIndex] = useState(0)

    // Dùng useMemo để tạo dữ liệu vô hạn (Infinity Carousel)
    const infiniteData = useMemo(() => {
        if (CAROUSEL_DATA_MOCK.length === 0) return []

        const startClones = CAROUSEL_DATA_MOCK.slice(-CLONE_COUNT).map((item, index) => ({
            ...item,
            id: `clone-start-${index}`,
            isClone: true,
        }))

        const mainData = CAROUSEL_DATA_MOCK.map(item => ({ ...item, isClone: false }))

        const endClones = CAROUSEL_DATA_MOCK.slice(0, CLONE_COUNT).map((item, index) => ({
            ...item,
            id: `clone-end-${index}`,
            isClone: true,
        }))

        return [...startClones, ...mainData, ...endClones]
    }, [])

    const totalDataLength = infiniteData.length
    const mainDataLength = CAROUSEL_DATA_MOCK.length
    const startIndex = CLONE_COUNT // Vị trí bắt đầu của dữ liệu gốc

    // --- LOGIC TỰ ĐỘNG CUỘN (5 giây) ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (!scrolling) {
                const nextOffset = currentScrollOffset.current + SNAP_INTERVAL

                flatListRef.current?.flashScrollIndicators()
                flatListRef.current?.scrollToOffset({
                    offset: nextOffset,
                    animated: true,
                })
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [scrolling])

    // --- LOGIC CUỘN VÔ HẠN (JUMP) VÀ CẬP NHẬT OFFSET ---
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x
        const isUserScrolling = event.nativeEvent.velocity?.x !== 0

        // 1. Cập nhật offset hiện tại cho Animated.Value (hiệu ứng 3D)
        scrollX.setValue(scrollOffset)
        // 2. Cập nhật offset hiện tại cho logic tự động cuộn
        currentScrollOffset.current = scrollOffset

        // 3. Kiểm tra nếu người dùng cuộn
        if (isUserScrolling) {
            setScrolling(true)
        }

        // 4. Logic JUMP Vô hạn
        const endOffset = (startIndex + mainDataLength - 1) * SNAP_INTERVAL

        if (scrollOffset >= endOffset + SNAP_INTERVAL) {
            flatListRef.current?.scrollToOffset({
                offset: startIndex * SNAP_INTERVAL,
                animated: false,
            })
        }
        else if (scrollOffset <= startIndex * SNAP_INTERVAL - SNAP_INTERVAL) {
            flatListRef.current?.scrollToOffset({
                offset: (startIndex + mainDataLength - 1) * SNAP_INTERVAL,
                animated: false,
            })
        }
    }

    // --- XỬ LÝ CHỈ SỐ (DOTS) VÀ KẾT THÚC CUỘN ---
    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x
        setScrolling(false) // Kết thúc cuộn của người dùng

        // Tính index tuyệt đối trong mảng infiniteData
        const totalIndex = Math.round(scrollOffset / SNAP_INTERVAL)

        // Chuyển sang index của mảng gốc (0 -> mainDataLength-1)
        let mainIndex = (totalIndex - startIndex) % mainDataLength
        if (mainIndex < 0) mainIndex += mainDataLength

        setCurrentIndex(mainIndex)
    }

    // --- XỬ LÝ SỰ KIỆN PRESS ---
    const handlePress = (item: any) => {
        if (item.isClone) return

        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
        }
    }

    // Thiết lập vị trí bắt đầu và offset ban đầu
    useEffect(() => {
        if (flatListRef.current && totalDataLength > 0) {
            const initialOffset = startIndex * SNAP_INTERVAL
            flatListRef.current.scrollToOffset({
                offset: initialOffset,
                animated: false,
            })
            // Cập nhật ref offset ban đầu
            currentScrollOffset.current = initialOffset
            scrollX.setValue(initialOffset) // Thiết lập giá trị Animated ban đầu
        }
    }, [totalDataLength])

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <HomeCarouselItem
            item={item}
            index={index}
            scrollX={scrollX}
            onPress={handlePress}
        />
    )

    return (
        <View style={styles.container}>
            <Animated.FlatList // Sử dụng Animated.FlatList để theo dõi cuộn
                ref={flatListRef}
                data={infiniteData}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                        useNativeDriver: false, // Phải dùng false nếu Animated không phải là style property
                        listener: handleScroll, // Vẫn gọi listener để xử lý infinity loop và update ref
                    }
                )}
                onMomentumScrollEnd={onMomentumScrollEnd}
                keyExtractor={(item) => item.id}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start" // Căn chỉnh vào điểm bắt đầu của item
                scrollEventThrottle={16}
            />
            <View style={styles.pagination}>
                {CAROUSEL_DATA_MOCK.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === currentIndex ? styles.activeDot : styles.inactiveDot,
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
        // FIXED_PADDING = 10, ITEM_SPACING/2 = 10
        // Padding = 10 - 10 = 0. Tác dụng của padding này là để item đầu tiên được cuộn về đúng vị trí (ITEM_WIDTH/2 - FIXED_PADDING)
        // Khi item có marginHorizontal: ITEM_SPACING/2, ta cần bù trừ padding:
        paddingHorizontal: FIXED_PADDING - ITEM_SPACING / 2,
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