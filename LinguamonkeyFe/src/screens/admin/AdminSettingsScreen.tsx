import React from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminSettingsScreen = () => {
    return (
        <ScreenLayout>
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Icon name="notifications" size={24} color="#64748B" />
                            <Text style={styles.rowText}>System Notifications</Text>
                            <Switch value={true} trackColor={{ false: "#E2E8F0", true: "#4F46E5" }} />
                        </View>
                        <TouchableOpacity style={styles.row} onPress={() => Alert.alert("Cache Cleared")}>
                            <Icon name="cached" size={24} color="#64748B" />
                            <Text style={styles.rowText}>Clear App Cache</Text>
                            <Icon name="chevron-right" size={24} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Icon name="info" size={24} color="#64748B" />
                            <Text style={styles.rowText}>Version</Text>
                            <Text style={styles.meta}>1.0.0 (Admin Build)</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: "#64748B", marginBottom: 8, textTransform: "uppercase" },
    card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
    rowText: { flex: 1, marginLeft: 12, fontSize: 16, color: "#1E293B" },
    meta: { color: "#94A3B8", fontSize: 14 }
});

export default AdminSettingsScreen;