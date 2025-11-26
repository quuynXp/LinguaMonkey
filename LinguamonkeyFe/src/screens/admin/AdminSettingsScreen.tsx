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
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminSettingsScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => console.log("Logout") },
        ]);
    };

    const SettingSection = ({ title, children }: any) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>{children}</View>
        </View>
    );

    const SettingItem = ({
        icon,
        color,
        label,
        value,
        type = "arrow",
        onPress,
    }: any) => (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            disabled={type === "info"}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                <Icon name={icon} size={22} color={color} />
            </View>
            <Text style={styles.itemLabel}>{label}</Text>
            <View style={styles.rightContent}>
                {type === "text" && <Text style={styles.valueText}>{value}</Text>}
                {type === "arrow" && <Icon name="chevron-right" size={22} color="#CBD5E1" />}
                {type === "switch" && (
                    <Switch
                        value={value}
                        onValueChange={onPress}
                        trackColor={{ false: "#E2E8F0", true: "#4F46E5" }}
                        thumbColor={"#fff"}
                    />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout>
            <ScrollView style={styles.container}>

                <SettingSection title="App Configuration">
                    <SettingItem
                        icon="info"
                        color="#4F46E5"
                        label="App Version"
                        value="1.0.0 (Build 24)"
                        type="text"
                    />
                    <SettingItem
                        icon="language"
                        color="#0EA5E9"
                        label="Language"
                        value="Vietnamese"
                        type="text"
                        onPress={() => Alert.alert("Info", "Change language in global settings")}
                    />
                    <SettingItem
                        icon="update"
                        color="#F59E0B"
                        label="Check for Updates"
                        type="arrow"
                        onPress={() => Alert.alert("System", "App is up to date")}
                    />
                </SettingSection>

                <SettingSection title="System & Cache">
                    <SettingItem
                        icon="notifications"
                        color="#EC4899"
                        label="System Notifications"
                        value={true}
                        type="switch"
                        onPress={() => { }}
                    />
                    <SettingItem
                        icon="cached"
                        color="#8B5CF6"
                        label="Clear Cache"
                        type="arrow"
                        onPress={() => Alert.alert("Success", "Cache cleared successfully")}
                    />
                    <SettingItem
                        icon="storage"
                        color="#64748B"
                        label="Database Sync"
                        type="arrow"
                        onPress={() => { }}
                    />
                </SettingSection>

                <SettingSection title="Admin Account">
                    <SettingItem
                        icon="lock"
                        color="#10B981"
                        label="Change Password"
                        type="arrow"
                        onPress={() => { }}
                    />
                    <SettingItem
                        icon="security"
                        color="#6366F1"
                        label="Two-Factor Auth"
                        value="Enabled"
                        type="text"
                    />
                </SettingSection>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>MonkeyLingua Admin Console © 2025</Text>

            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#64748B",
        marginBottom: 12,
        marginLeft: 4,
        textTransform: "uppercase",
    },
    sectionContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    itemLabel: {
        flex: 1,
        fontSize: 15,
        color: "#1E293B",
        fontWeight: "600",
    },
    rightContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    valueText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    logoutBtn: {
        backgroundColor: "#FEF2F2",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#FEE2E2",
    },
    logoutText: {
        color: "#EF4444",
        fontWeight: "700",
        fontSize: 16,
    },
    footerText: {
        textAlign: "center",
        marginTop: 24,
        marginBottom: 40,
        color: "#94A3B8",
        fontSize: 12,
    },
});

export default AdminSettingsScreen;