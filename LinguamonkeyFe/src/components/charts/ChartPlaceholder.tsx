import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createScaledSheet } from '../../utils/scaledStyles';

const ChartPlaceholder = () => {
    return (
        <View style={styles.chartContainer}>
            <Text style={styles.placeholderText}>
                [BIỂU ĐỒ TIẾN TRÌNH]
            </Text>
            <Text style={styles.subText}>
                Dữ liệu cho biểu đồ này sẽ được tải dựa trên bộ lọc thời gian.
            </Text>
            <View style={styles.chartBox} />
        </View>
    )
}

const styles = createScaledSheet({
    chartContainer: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 250,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 20,
    },
    placeholderText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    subText: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "center",
        marginBottom: 16,
    },
    chartBox: {
        width: "100%",
        height: 150,
        backgroundColor: "#EEF2FF",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#4F46E5",
        borderStyle: "dashed",
    }
})

export default ChartPlaceholder