import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { getStatisticsOverview } from "../../services/statisticsApi";
import { authService } from "../../services/authService";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

type Period = "week" | "month" | "year";

const AdminDashboardScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-stats-overview", selectedPeriod],
    queryFn: () => getStatisticsOverview({ period: selectedPeriod }),
  });

  const handleLogout = () => {
    Alert.alert(
      t("admin.auth.logoutTitle") || "Logout",
      t("admin.auth.logoutConfirm") || "Are you sure you want to logout?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await authService.logout();
            } catch (error) {
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const navigateTo = (route: string) => {
    navigation.navigate(route);
  };

  const StatBlock = ({ label, value, icon, color, bgColor }: any) => (
    <View style={[styles.statBlock, { backgroundColor: bgColor }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconBubble, { backgroundColor: "#fff" }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Text style={[styles.statValue, { color: color }]}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuStepItem = ({ title, subtitle, icon, color, route, isLast }: any) => (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={() => navigateTo(route)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconBox, { backgroundColor: `${color}10` }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />

      <View style={styles.headerWrapper}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <Icon name="admin-panel-settings" size={32} color="#4F46E5" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileRole}>System Administrator</Text>
            <Text style={styles.profileName}>Admin Control</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigateTo("AdminSettingsScreen")}
          >
            <Icon name="settings" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setSelectedPeriod(p)}
              style={[
                styles.filterBtn,
                selectedPeriod === p && styles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedPeriod === p && styles.filterTextActive,
                ]}
              >
                {t(`common.period.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <View style={styles.statsGrid}>
          <StatBlock
            label={t("admin.stats.revenue")}
            value={`$${(stats?.revenue || 0).toLocaleString()}`}
            icon="attach-money"
            color="#059669"
            bgColor="#ECFDF5"
          />
          <StatBlock
            label={t("admin.stats.users")}
            value={stats?.users || 0}
            icon="people"
            color="#4F46E5"
            bgColor="#EEF2FF"
          />
          <StatBlock
            label={t("admin.stats.courses")}
            value={stats?.courses || 0}
            icon="school"
            color="#D97706"
            bgColor="#FFFBEB"
          />
          <StatBlock
            label={t("admin.stats.transactions")}
            value={stats?.transactions || 0}
            icon="receipt-long"
            color="#DC2626"
            bgColor="#FEF2F2"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t("admin.section.management")}</Text>
          <View style={styles.menuCard}>
            <MenuStepItem
              title={t("admin.screens.users")}
              subtitle="User accounts & permissions"
              icon="group"
              color="#4F46E5"
              route="AdminUserManagementScreen"
            />
            <MenuStepItem
              title={t("admin.screens.courses")}
              subtitle="Manage courses & curriculum"
              icon="library-books"
              color="#F59E0B"
              route="AdminCourseManagementScreen"
            />
            <MenuStepItem
              title={t("admin.screens.lessons")}
              subtitle="Manage individual lessons"
              icon="class"
              color="#8B5CF6"
              route="AdminLessonManagementScreen"
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t("admin.section.content_business")}</Text>
          <View style={styles.menuCard}>
            <MenuStepItem
              title={t("admin.screens.createVideo")}
              subtitle="Upload and manage videos"
              icon="video-library"
              color="#EC4899"
              route="AdminCreateVideoScreen"
            />
            <MenuStepItem
              title={t("admin.screens.analytics")}
              subtitle="Revenue detailed reports"
              icon="analytics"
              color="#10B981"
              route="AdminRevenueAnalyticsScreen"
            />
            <MenuStepItem
              title={t("admin.screens.transactions")}
              subtitle="Payment history logs"
              icon="history"
              color="#6366F1"
              route="AdminTransactionScreen"
              isLast
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t("admin.auth.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerWrapper: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileRole: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  filterBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  filterTextActive: {
    color: "#0F172A",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  statBlock: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    justifyContent: "space-between",
    minHeight: 110,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statIconBubble: {
    padding: 8,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    gap: 8
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15
  }
});

export default AdminDashboardScreen;