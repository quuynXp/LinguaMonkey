import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import { useAdmin } from "../../hooks/useAdmin";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import { formatCurrency } from "../../utils/formatCurrency";
type TabType = "COURSES" | "REFUNDS";

const AdminCourseManagementScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const user = useUserStore(state => state.user);

  const [activeTab, setActiveTab] = useState<TabType>("COURSES");
  const [page, setPage] = useState(0);

  // Hooks
  const { useAllCourses, useDeleteCourse } = useCourses();
  const { usePendingRefunds, useApproveRefund, useRejectRefund } = useAdmin();

  // Data
  const { data: courseData, isLoading: coursesLoading, refetch: refetchCourses } = useAllCourses({ page, size: 20 });
  const { data: refundData, isLoading: refundsLoading, refetch: refetchRefunds } = usePendingRefunds(0, 20);

  // Mutations
  const { mutate: deleteCourse } = useDeleteCourse();
  const { mutate: approveRefund, isPending: isApproving } = useApproveRefund();
  const { mutate: rejectRefund, isPending: isRejecting } = useRejectRefund();

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApproveRefund = (item: any) => {
    Alert.alert(
      t("admin.refunds.approveTitle"),
      t("admin.refunds.approveConfirm", { amount: formatCurrency(item.amount), user: item.requesterName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.approve"),
          onPress: () => approveRefund({ refundTransactionId: item.refundTransactionId })
        },
      ]
    );
  };

  const openRejectModal = (id: string) => {
    setSelectedRefundId(id);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = () => {
    if (selectedRefundId && user?.userId) {
      rejectRefund({
        id: selectedRefundId,
        adminId: user.userId,
        reason: rejectReason
      }, {
        onSuccess: () => setRejectModalVisible(false)
      });
    }
  };

  const confirmDeleteCourse = (id: string, title: string) => {
    Alert.alert(
      t("admin.courses.deleteTitle"),
      t("admin.courses.deleteConfirm", { title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => deleteCourse(id) },
      ]
    );
  };

  const renderCourseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("AdminCourseDetailScreen", { courseId: item.courseId })}
    >
      <View style={styles.cardIcon}>
        <Icon name="school" size={24} color="#F59E0B" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.creatorName || "Unknown"} • {item.price ? `$${item.price}` : "Free"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => confirmDeleteCourse(item.courseId, item.title)}
      >
        <Icon name="delete" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRefundItem = ({ item }: { item: any }) => (
    <View style={styles.refundCard}>
      <View style={styles.refundHeader}>
        <Text style={styles.refundUser}>{item.requesterName}</Text>
        <Text style={styles.refundAmount}>${item.amount}</Text>
      </View>
      <Text style={styles.refundCourse}>Course: {item.courseName}</Text>
      <Text style={styles.refundReason}>{"Reason: {item.reason}"}</Text>
      <Text style={styles.refundDate}>{new Date(item.requestDate).toLocaleDateString()}</Text>

      <View style={styles.refundActions}>
        <TouchableOpacity
          style={[styles.refundBtn, styles.btnReject]}
          onPress={() => openRejectModal(item.refundTransactionId)}
          disabled={isRejecting || isApproving}
        >
          <Text style={styles.btnTextReject}>{t("common.reject")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.refundBtn, styles.btnApprove]}
          onPress={() => handleApproveRefund(item)}
          disabled={isRejecting || isApproving}
        >
          <Text style={styles.btnTextApprove}>{t("common.approve")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("admin.dashboard")}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "COURSES" && styles.activeTab]}
            onPress={() => setActiveTab("COURSES")}
          >
            <Text style={[styles.tabText, activeTab === "COURSES" && styles.activeTabText]}>Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "REFUNDS" && styles.activeTab]}
            onPress={() => setActiveTab("REFUNDS")}
          >
            <Text style={[styles.tabText, activeTab === "REFUNDS" && styles.activeTabText]}>
              Refunds {refundData?.totalElements ? `(${refundData.totalElements})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "COURSES" ? (
          <FlatList
            data={courseData?.data}
            keyExtractor={(item) => item.courseId}
            renderItem={renderCourseItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={coursesLoading} onRefresh={refetchCourses} />}
            onEndReached={() => {
              if (courseData?.pagination?.hasNext) setPage((prev) => prev + 1);
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("admin.courses.noCourses")}</Text>
            }
          />
        ) : (
          <FlatList
            data={refundData?.content}
            keyExtractor={(item) => item.refundTransactionId}
            renderItem={renderRefundItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refundsLoading} onRefresh={refetchRefunds} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("admin.refunds.noRequests")}</Text>
            }
          />
        )}

        {/* Reject Modal */}
        <Modal visible={rejectModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("admin.refunds.rejectReason")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Reason..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalBtn}>
                  <Text style={styles.modalBtnText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmReject} style={[styles.modalBtn, styles.btnReject]}>
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>{t("common.confirm")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B" },

  tabContainer: { flexDirection: "row", padding: 16, gap: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#E2E8F0" },
  activeTab: { backgroundColor: "#4F46E5" },
  tabText: { fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#FFF" },

  listContent: { padding: 16 },

  // Course Card
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  cardMeta: { fontSize: 13, color: "#64748B" },
  actionBtn: { padding: 8 },

  // Refund Card
  refundCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, borderLeftWidth: 4, borderLeftColor: "#F59E0B" },
  refundHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  refundUser: { fontWeight: "700", fontSize: 16, color: "#1F2937" },
  refundAmount: { fontWeight: "800", fontSize: 16, color: "#EF4444" },
  refundCourse: { fontSize: 14, color: "#4B5563", marginBottom: 4 },
  refundReason: { fontSize: 14, fontStyle: "italic", color: "#6B7280", marginBottom: 8 },
  refundDate: { fontSize: 12, color: "#9CA3AF", marginBottom: 12 },
  refundActions: { flexDirection: "row", gap: 12 },
  refundBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  btnReject: { backgroundColor: "#FEE2E2" },
  btnApprove: { backgroundColor: "#DCFCE7" },
  btnTextReject: { color: "#991B1B", fontWeight: "600" },
  btnTextApprove: { color: "#166534", fontWeight: "600" },

  emptyText: { textAlign: "center", marginTop: 40, color: "#94A3B8" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", backgroundColor: "#FFF", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, height: 80, textAlignVertical: "top", marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  modalBtnText: { fontWeight: "600", color: "#374151" },
});

export default AdminCourseManagementScreen;