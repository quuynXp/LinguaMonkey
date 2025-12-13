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

const ITEM_FULL_WIDTH = ITEM_WIDTH + ITEM_SPACING
const PADDING_HORIZONTAL = (SCREEN_WIDTH - ITEM_FULL_WIDTH) / 2

const HomeCarousel = ({ navigation }: any) => {
    const { t, i18n } = useTranslation("motivation")
    const flatListRef = useRef<FlatList>(null)

    const scrollX = useRef(new Animated.Value(0)).current
    const [currentIndex, setCurrentIndex] = useState(0)

    const carouselData = useMemo(() => [
        {
            id: "1",
            type: "FLASHSALE",
            title: t("carousel.flashSale.title"),
            subtitle: t("carousel.flashSale.subtitle"),
            color: "#4F46E5",
            icon: "flash-on",
        },
        {
            id: "2",
            type: "DEPOSIT",
            title: t("carousel.deposit.title"),
            subtitle: t("carousel.deposit.subtitle"),
            color: "#059669",
            icon: "account-balance-wallet",
        },
        {
            id: "3",
            type: "NEW",
            title: t("carousel.new.title"),
            subtitle: t("carousel.new.subtitle"),
            color: "#DB2777",
            icon: "new-releases",
        },
    ], [t, i18n.language]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: true,
        }
    )

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x
        const newIndex = Math.round(scrollOffset / ITEM_FULL_WIDTH)
        const mainIndex = Math.min(Math.max(0, newIndex), carouselData.length - 1)
        setCurrentIndex(mainIndex)
    }

    const handlePress = (item: any) => {
        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
        }
    }

    const renderItem = ({ item, index }: { item: typeof carouselData[0], index: number }) => (
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
                data={carouselData}
                extraData={i18n.language}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onScroll={handleScroll}
                onMomentumScrollEnd={onMomentumScrollEnd}
                keyExtractor={(item) => item.id}
                snapToInterval={ITEM_FULL_WIDTH}
                snapToAlignment="center"
                scrollEventThrottle={16}
            />

            <View style={styles.paginationContainer}>
                <View style={styles.pagination}>
                    {carouselData.map((_, i) => (
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