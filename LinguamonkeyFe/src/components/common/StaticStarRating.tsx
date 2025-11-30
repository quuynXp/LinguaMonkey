import React from "react";
import { View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

interface StaticStarRatingProps {
    rating: number;
    size?: number;
    activeColor?: string;
    inactiveColor?: string;
}

const StaticStarRating: React.FC<StaticStarRatingProps> = ({
    rating,
    size = 14,
    activeColor = "#F59E0B",
    inactiveColor = "#D1D5DB",
}) => {
    const normalizedRating = Math.min(5, Math.max(0, Math.round(rating)));
    const stars = [1, 2, 3, 4, 5];

    return (
        <View style={styles.container}>
            {stars.map((star) => (
                <Icon
                    key={star}
                    name="star"
                    size={size}
                    color={star <= normalizedRating ? activeColor : inactiveColor}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 8,
    },
});

export default StaticStarRating;