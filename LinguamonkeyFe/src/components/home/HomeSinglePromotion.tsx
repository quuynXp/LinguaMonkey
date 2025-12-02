import React, { useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Animated, ImageBackground, StyleSheet } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { createScaledSheet } from "../../utils/scaledStyles"
import { gotoTab } from "../../utils/navigationRef"
import { ITEM_WIDTH, SCREEN_WIDTH } from "../../constants/Dimensions"

// Dữ liệu mẫu (chỉ lấy item đầu tiên để hiển thị)
const PROMOTION_ITEM = {
    id: "1",
    type: "FLASHSALE",
    title: "Flash Sale 50% Off",
    subtitle: "Unlock top-rated courses now!",
    color: "#4F46E5",
    icon: "flash-on",
}

const getPromotionBackgroundImage = (type: string) => {
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

const HomeSinglePromotion = ({ navigation }: any) => {
    const { t } = useTranslation()
    const pulseAnim = useRef(new Animated.Value(1)).current // Dành cho hiệu ứng nhấp nháy/phóng to-thu nhỏ
    const shakeAnim = useRef(new Animated.Value(0)).current // Dành cho hiệu ứng rung lắc

    const item = PROMOTION_ITEM

    useEffect(() => {
        // --- Pulse Animation (Nhấp nháy nhẹ) ---
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.02,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        )
        pulseAnimation.start()

        // --- Shake Animation (Rung lắc nhẹ) ---
        const shakeAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                Animated.delay(3000), // Delay 3 giây trước khi lặp lại
            ])
        )
        shakeAnimation.start()

        return () => {
            pulseAnimation.stop()
            shakeAnimation.stop()
        }
    }, [pulseAnim, shakeAnim])

    const handlePress = () => {
        if (navigation) {
            navigation.navigate("SpecialOfferScreen", { type: item.type })
        } else {
            gotoTab("HomeStack", "SpecialOfferScreen", { type: item.type })
        }
    }

    const backgroundImage = getPromotionBackgroundImage(item.type)

    // Interpolate cho hiệu ứng shake
    const translateX = shakeAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-2, 0, 2],
    })

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.wrapper,
                    {
                        transform: [{ scale: pulseAnim }, { translateX }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.touchable}
                    activeOpacity={0.9}
                    onPress={handlePress}
                >
                    <ImageBackground
                        source={backgroundImage}
                        resizeMode="cover"
                        style={styles.card}
                        imageStyle={styles.cardImage}
                    >
                        {/* Gradient Overlay */}
                        <View style={styles.gradientOverlay}>
                            <View style={styles.textContainer}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{t("common.hot")}</Text>
                                    <Icon name="whatshot" size={12} color="#FF6B35" style={{ marginLeft: 4 }} />
                                </View>
                                <Text style={styles.title}>{t("home.promo.title")}</Text>
                                <Text style={styles.subtitle}>{t("home.promo.subtitle")}</Text>
                            </View>
                            <View style={[styles.discountTag, { backgroundColor: item.color }]}>
                                <Text style={styles.discountText}>-50%</Text>
                            </View>
                        </View>
                        {/* Animated Icon (Bounce) */}
                        <Animated.View style={styles.iconContainer}>
                            <Icon name={item.icon} size={70} color="rgba(255,255,255,0.7)" />
                        </Animated.View>
                    </ImageBackground>
                </TouchableOpacity>
            </Animated.View>
        </View>
    )
}

// Thay thế ITEM_WIDTH bằng 100% (hoặc SCREEN_WIDTH trừ padding) cho 1 item
const PROMO_WIDTH = SCREEN_WIDTH - 48 // 24px padding mỗi bên

const styles = createScaledSheet({
    container: {
        marginVertical: 16,
        paddingHorizontal: 24,
    },
    wrapper: {
        width: PROMO_WIDTH,
        height: 160,
    },
    touchable: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#E5E7EB",
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    card: {
        flex: 1,
        borderRadius: 20,
    },
    cardImage: {
        borderRadius: 20,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
        justifyContent: 'center',
    },
    badge: {
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        color: "#1F2937",
        fontSize: 10,
        fontWeight: "bold",
    },
    title: {
        color: "#fff",
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 4,
    },
    subtitle: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 14,
    },
    discountTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    discountText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    iconContainer: {
        position: "absolute",
        right: 15,
        bottom: 10,
        opacity: 0.5,
        zIndex: 1,
        transform: [{ rotate: "-10deg" }],
    },
})

export default HomeSinglePromotion