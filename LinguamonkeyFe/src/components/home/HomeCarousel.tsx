import React, { useRef, useState } from "react"
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

// Chiều rộng đầy đủ của item (ITEM_WIDTH + Khoảng cách)
const ITEM_FULL_WIDTH = ITEM_WIDTH + ITEM_SPACING
// PADDING CẦN THIẾT cho contentContainerStyle để item có thể cuộn vào giữa màn hình
// Padding = (Screen Width - Item Full Width) / 2
const PADDING_HORIZONTAL = (SCREEN_WIDTH - ITEM_FULL_WIDTH) / 2

const HomeCarousel = ({ navigation }: any) => {
    const { t } = useTranslation()
    const flatListRef = useRef<FlatList>(null)

    const scrollX = useRef(new Animated.Value(0)).current
    const [currentIndex, setCurrentIndex] = useState(0)

    const data = CAROUSEL_DATA
    const mainDataLength = CAROUSEL_DATA.length

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: true,
        }
    )

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x

        // Tính toán index dựa trên offset và ITEM_FULL_WIDTH
        const newIndex = Math.round(scrollOffset / ITEM_FULL_WIDTH)

        const mainIndex = Math.min(Math.max(0, newIndex), mainDataLength - 1)
        setCurrentIndex(mainIndex)
    }

    const handlePress = (item: any) => {
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
                snapToInterval={ITEM_FULL_WIDTH}
                snapToAlignment="center" // Đã đổi sang center
                scrollEventThrottle={16}
            />

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
        // Áp dụng PADDING_HORIZONTAL đã tính toán
        paddingHorizontal: PADDING_HORIZONTAL,
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