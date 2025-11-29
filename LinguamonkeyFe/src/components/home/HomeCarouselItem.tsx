import React from "react"
import { View, Text, TouchableOpacity, Animated } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import LinearGradient from "react-native-linear-gradient"
import { createScaledSheet } from "../../utils/scaledStyles"
import { ITEM_WIDTH, ITEM_SPACING } from "./HomeCarousel"

interface CarouselItem {
    id: string
    type: string
    title: string
    subtitle: string
    color: string
    icon: string
    isClone?: boolean
}

interface HomeCarouselItemProps {
    item: CarouselItem
    index: number
    scrollX: Animated.Value
    onPress: (item: CarouselItem) => void
}

const getGradientColors = (baseColor: string) => {
    switch (baseColor) {
        case "#4F46E5":
            return ["#6366F1", "#4F46E5"]
        case "#059669":
            return ["#10B981", "#059669"]
        case "#DB2777":
            return ["#F472B6", "#DB2777"]
        default:
            return ["#6B7280", "#4B5563"]
    }
}

const HomeCarouselItem = ({ item, index, scrollX, onPress }: HomeCarouselItemProps) => {
    const INPUT_RANGE = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH]
    const OUTPUT_RANGE_OPACITY = [0.5, 1, 0.5] // Item trước/sau mờ đi 50%
    const OUTPUT_RANGE_SCALE = [0.95, 1, 0.95] // Item trước/sau thu nhỏ 5%

    // Ánh xạ độ mờ và tỉ lệ dựa trên vị trí cuộn
    const opacity = scrollX.interpolate({
        inputRange: INPUT_RANGE,
        outputRange: OUTPUT_RANGE_OPACITY,
        extrapolate: "clamp",
    })

    const scale = scrollX.interpolate({
        inputRange: INPUT_RANGE,
        outputRange: OUTPUT_RANGE_SCALE,
        extrapolate: "clamp",
    })

    const gradientColors = getGradientColors(item.color)

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    opacity,
                    transform: [{ scale }],
                    // Margin Horizontal để tạo khoảng cách giữa các thẻ
                    marginHorizontal: ITEM_SPACING / 2,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.touchable}
                activeOpacity={1} // Đã dùng hiệu ứng scale nên dùng activeOpacity = 1
                onPress={() => onPress(item)}
                disabled={item.isClone}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.fireworksEffect} />
                    <View style={styles.textContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.isClone ? "CLONE" : "HOT"}</Text>
                        </View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                    <Icon name={item.icon} size={60} color="rgba(255,255,255,0.3)" style={styles.icon} />
                    <View style={styles.arrowBtn}>
                        <Icon name="arrow-forward" size={20} color={gradientColors[1]} />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = createScaledSheet({
    wrapper: {
        width: ITEM_WIDTH,
        height: 140,
    },
    touchable: {
        width: "100%",
        height: "100%",
        borderRadius: 16,
        overflow: "hidden",
    },
    card: {
        width: "100%",
        height: "100%",
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
    },
    fireworksEffect: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.15,
        backgroundColor: "white",
        borderRadius: 16,
        transform: [{ scale: 1.1 }],
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
        right: 0,
        bottom: 0,
        transform: [{ rotate: "-15deg" }],
        zIndex: 1,
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
})

export default HomeCarouselItem