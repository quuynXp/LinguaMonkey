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
        const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48))
        setActiveIndex(index)
    }

    const handlePress = (item: any) => {
        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
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
                pagingEnabled
                snapToInterval={SCREEN_WIDTH - 48}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onMomentumScrollEnd={onMomentumScrollEnd}
                keyExtractor={(item) => item.id}
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
        paddingHorizontal: 24,
        gap: 12,
    },
    card: {
        width: SCREEN_WIDTH - 48,
        height: 140,
        borderRadius: 16,
        padding: 20,
        marginRight: 12,
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