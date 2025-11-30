import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

interface StarRatingInputProps {
    rating: number;
    onRatingChange: (rating: number) => void;
    size?: number;
    disabled?: boolean;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
    rating,
    onRatingChange,
    size = 24,
    disabled = false,
}) => {
    const stars = [1, 2, 3, 4, 5];

    return (
        <View style={styles.container}>
            {stars.map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => !disabled && onRatingChange(star)}
                    activeOpacity={disabled ? 1 : 0.7}
                    style={styles.starContainer}
                >
                    <Icon
                        name="star"
                        size={size}
                        color={star <= rating ? "#F59E0B" : "#D1D5DB"}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    starContainer: {
        padding: 2,
    },
});

export default StarRatingInput;