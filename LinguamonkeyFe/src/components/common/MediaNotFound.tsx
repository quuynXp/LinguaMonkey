import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

interface MediaNotFoundProps {
    type?: string;
    message?: string;
}

const MediaNotFound: React.FC<MediaNotFoundProps> = ({
    type = "Media",
    message
}) => {
    return (
        <View style={styles.notFoundContainer}>
            <Icon name="broken-image" size={32} color="#EF4444" />
            <Text style={styles.notFoundText}>{message || `${type} Not Found`}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    notFoundContainer: {
        width: "100%",
        height: 150,
        backgroundColor: "#FEE2E2",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#EF4444",
        borderStyle: "dashed",
    },
    notFoundText: {
        marginTop: 8,
        color: "#B91C1C",
        fontWeight: "600",
    },
});

export default MediaNotFound;