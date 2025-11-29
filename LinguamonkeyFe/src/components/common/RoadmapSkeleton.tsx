import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const SkeletonItem = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <View style={styles.itemContainer}>
            <View style={styles.leftColumn}>
                <Animated.View style={[styles.circle, { opacity }]} />
                <View style={styles.line} />
            </View>
            <View style={styles.rightColumn}>
                <Animated.View style={[styles.card, { opacity }]}>
                    <Animated.View style={[styles.textBar, { width: "60%", height: 20, marginBottom: 10, opacity }]} />
                    <Animated.View style={[styles.textBar, { width: "90%", height: 14, marginBottom: 6, opacity }]} />
                    <Animated.View style={[styles.textBar, { width: "40%", height: 14, opacity }]} />
                </Animated.View>
            </View>
        </View>
    );
};

const RoadmapSkeleton = () => {
    return (
        <View style={styles.container}>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
    },
    itemContainer: {
        flexDirection: "row",
        marginBottom: 0,
        minHeight: 100,
    },
    leftColumn: {
        alignItems: "center",
        marginRight: 16,
        width: 40,
    },
    rightColumn: {
        flex: 1,
        paddingBottom: 24,
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E5E7EB",
        marginBottom: 8,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        height: 120,
        width: "100%",
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    textBar: {
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
    },
});

export default RoadmapSkeleton;