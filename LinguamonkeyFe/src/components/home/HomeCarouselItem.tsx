import React from "react"
import { View, Text, TouchableOpacity, Animated, ImageBackground, StyleSheet } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { createScaledSheet } from "../../utils/scaledStyles"
import { ITEM_WIDTH, ITEM_SPACING } from "../../constants/Dimensions"

const getCarouselBackgroundImage = (type: string) => {
    switch (type) {
        case "FLASHSALE":
            return require("../../assets/images/ImagePlacehoderCourse.png")
        case "DEPOSIT":
            return require("../../assets/images/ImagePlacehoderCourse.png")
        case "NEW":
            return require("../../assets/images/ImagePlacehoderCourse.png")
        default:
            return require("../../assets/images/ImagePlacehoderCourse.png")
    }
}

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

const HomeCarouselItem = ({ item, index, scrollX, onPress }: HomeCarouselItemProps) => {
    const { t } = useTranslation("motivation")
    const ITEM_FULL_WIDTH = ITEM_WIDTH + ITEM_SPACING

    const INPUT_RANGE = [
        (index - 1) * ITEM_FULL_WIDTH,
        index * ITEM_FULL_WIDTH,
        (index + 1) * ITEM_FULL_WIDTH,
    ]

    const OUTPUT_RANGE_OPACITY = [0.5, 1, 0.5]
    const OUTPUT_RANGE_SCALE = [0.9, 1, 0.9]

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

    const backgroundImage = getCarouselBackgroundImage(item.type)

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    opacity,
                    transform: [{ scale }],
                    marginHorizontal: ITEM_SPACING / 2,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.touchable}
                activeOpacity={0.9}
                onPress={() => onPress(item)}
            >
                <ImageBackground
                    source={backgroundImage}
                    resizeMode="cover"
                    style={styles.card}
                    imageStyle={styles.cardImage}
                >
                    <View style={styles.overlay} />
                    <View style={styles.textContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t("carousel.badge.hot")}</Text>
                        </View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                    <Icon name={item.icon} size={60} color="rgba(255,255,255,0.3)" style={styles.icon} />
                </ImageBackground>
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
        backgroundColor: "#E5E7EB",
    },
    card: {
        flex: 1,
        padding: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
    },
    cardImage: {
        borderRadius: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 16,
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
})

export default HomeCarouselItem