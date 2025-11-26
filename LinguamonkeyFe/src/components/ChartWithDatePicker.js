// ChartWithDatePicker.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { VictoryBar, VictoryChart, VictoryTheme } from "victory-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createScaledSheet } from "../utils/scaledStyles";

const ChartWithDatePicker = () => {
  const [timeRange, setTimeRange] = useState("week"); // "day" | "week" | "month" | "year"
  const [showModal, setShowModal] = useState(false);

  // Mock data theo từng khoảng thời gian
  const getChartData = () => {
    switch (timeRange) {
      case "day":
        return [
          { label: "0-6h", value: 20 },
          { label: "6-12h", value: 35 },
          { label: "12-18h", value: 40 },
          { label: "18-24h", value: 25 },
        ];
      case "week":
        return [
          { label: "Mon", value: 50 },
          { label: "Tue", value: 70 },
          { label: "Wed", value: 65 },
          { label: "Thu", value: 80 },
          { label: "Fri", value: 55 },
          { label: "Sat", value: 90 },
          { label: "Sun", value: 40 },
        ];
      case "month":
        return [
          { label: "Week 1", value: 200 },
          { label: "Week 2", value: 180 },
          { label: "Week 3", value: 250 },
          { label: "Week 4", value: 220 },
        ];
      case "year":
        return [
          { label: "Jan", value: 800 },
          { label: "Feb", value: 950 },
          { label: "Mar", value: 700 },
          { label: "Apr", value: 850 },
          { label: "May", value: 930 },
          { label: "Jun", value: 760 },
          { label: "Jul", value: 1020 },
          { label: "Aug", value: 880 },
          { label: "Sep", value: 940 },
          { label: "Oct", value: 990 },
          { label: "Nov", value: 870 },
          { label: "Dec", value: 1120 },
        ];
      default:
        return [];
    }
  };

  const timeLabel = {
    day: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };

  return (
    <View style={styles.container}>
      {/* Nút chọn thời gian */}
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => setShowModal(true)}
      >
        <Icon name="event" size={20} color="#4F46E5" />
        <Text style={styles.timeButtonText}>{timeLabel[timeRange]}</Text>
      </TouchableOpacity>

      {/* Biểu đồ */}
      <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 20 }}>
        <VictoryBar
          data={getChartData()}
          x="label"
          y="value"
          style={{
            data: { fill: "#4F46E5", borderRadius: 6 },
            labels: { fontSize: 10 },
          }}
        />
      </VictoryChart>

      {/* Modal chọn thời gian */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {Object.keys(timeLabel).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.modalOption,
                  timeRange === range && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setTimeRange(range);
                  setShowModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    timeRange === range && styles.modalOptionTextSelected,
                  ]}
                >
                  {timeLabel[range]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = createScaledSheet({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 3,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    padding: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    marginBottom: 10,
  },
  timeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "70%",
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalOptionSelected: {
    backgroundColor: "#EEF2FF",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  modalOptionTextSelected: {
    color: "#4F46E5",
    fontWeight: "700",
  },
});

export default ChartWithDatePicker;
