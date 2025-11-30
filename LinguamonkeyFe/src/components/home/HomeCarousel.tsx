import React, { useRef, useState, useMemo } from "react"
import {
    View,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Animated,
} from "react-native"
import { useTranslation } from "react-i18next"
import { createScaledSheet } from "../../utils/scaledStyles"
import { gotoTab } from "../../utils/navigationRef"
import HomeCarouselItem from "./HomeCarouselItem"
import {
    ITEM_SPACING,
    ITEM_WIDTH,
    SCREEN_WIDTH
} from "../../constants/Dimensions"

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

// Tính toán khoảng cách padding cần thiết để căn giữa (center-focus) item
// snapToInterval = ITEM_WIDTH + ITEM_SPACING (Đã bỏ SNAP_INTERVAL)
const ITEM_FULL_WIDTH = ITEM_WIDTH + ITEM_SPACING
// Khoảng padding bên trái/phải = (Chiều rộng màn hình - Chiều rộng item) / 2
// Trừ đi nửa khoảng cách giữa các item để item đầu tiên được căn giữa hoàn hảo
const horizontalPadding = (SCREEN_WIDTH - ITEM_WIDTH) / 2 - ITEM_SPACING / 2

const HomeCarousel = ({ navigation }: any) => {
    const { t } = useTranslation()
    const flatListRef = useRef<FlatList>(null)

    // Sử dụng scrollX để truyền giá trị cuộn cho Animated.View
    const scrollX = useRef(new Animated.Value(0)).current
    const [currentIndex, setCurrentIndex] = useState(0)

    const mainDataLength = CAROUSEL_DATA.length

    // Bỏ logic infinite scrolling phức tạp, dùng data gốc
    const data = CAROUSEL_DATA

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: true, // Thường là true cho hiệu suất
        }
    )

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x

        // Tính index hiện tại dựa trên offset
        // Làm tròn đến index gần nhất
        const newIndex = Math.round(scrollOffset / ITEM_FULL_WIDTH)

        // Đảm bảo index nằm trong phạm vi dữ liệu
        const mainIndex = Math.min(Math.max(0, newIndex), mainDataLength - 1)
        setCurrentIndex(mainIndex)
    }

    const handlePress = (item: any) => {
        // Bỏ kiểm tra item.isClone vì không còn clone

        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
        }
    }

    const renderItem = ({ item, index }: { item: (typeof CAROUSEL_DATA)[0], index: number }) => (
        <HomeCarouselItem
            item={item}
            index={index}
            scrollX={scrollX}
            onPress={handlePress}
        // Không cần truyền thêm prop nào liên quan đến logic phức tạp nữa
        />
    )

    return (
        <View style={styles.container}>
            <Animated.FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onScroll={handleScroll}
                onMomentumScrollEnd={onMomentumScrollEnd}
                keyExtractor={(item) => item.id}
                snapToInterval={ITEM_FULL_WIDTH} // Đảm bảo cuộn dừng đúng tại item
                snapToAlignment="start" // Bắt đầu từ đầu mỗi item
                scrollEventThrottle={16}
                // Thêm padding cho các item ở đầu và cuối để chúng có thể cuộn vào giữa
                ListHeaderComponent={<View style={{ width: horizontalPadding }} />}
                ListFooterComponent={<View style={{ width: horizontalPadding }} />}
            />

            {/* Pagination đơn giản, bỏ các nút điều hướng */}
            <View style={styles.paginationContainer}>
                <View style={styles.pagination}>
                    {CAROUSEL_DATA.map((_, i) => (
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
        </View>
    )
}

const styles = createScaledSheet({
    container: {
        marginVertical: 16,
    },
    listContent: {
        // Đã bỏ paddingLeft/Right ở đây, thay bằng ListHeader/FooterComponent
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    pagination: {
        flexDirection: "row",
        justifyContent: "center",
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