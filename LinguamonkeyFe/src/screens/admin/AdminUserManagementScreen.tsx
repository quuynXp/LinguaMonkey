import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useUsers } from "../../hooks/useUsers"
import { formatDateTime } from "../../utils/timeHelper"
import Toast from "../../components/Toast"

const AdminUserManagementScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [page, setPage] = useState(1)

  // Lấy hooks
  const { useAllUsers, useUpdateUser, useDeleteUser } = useUsers()

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useAllUsers({
    page,
    size: 20, // chỗ này hook nhận size chứ ko phải limit
    email: searchQuery || undefined,
    // nếu muốn filter theo role thì cần backend hỗ trợ query param role
  })

  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const users = usersData?.data || [] // tuỳ backend trả `content` hay `data`
  const pagination = usersData?.pagination

  const handleUpdateRole = (userId: string, roleId: string) => {
    Alert.alert(t("admin.users.updateRole"), t("admin.users.updateRoleConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: () => {
          updateUser.mutate(
            { id: userId, data: { role: roleId } },
            {
              onSuccess: () => {
                Toast.show({ type: "success", text1: t("admin.users.roleUpdated") })
                setShowUserModal(false)
                refetch()
              },
              onError: (error: any) => {
                Toast.show({ type: "error", text1: t("common.error"), text2: error.message })
              },
            },
          )
        },
      },
    ])
  }

  const handleDeleteUser = (userId: string) => {
    Alert.alert(t("admin.users.deleteUser"), t("admin.users.deleteUserConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          deleteUser.mutate(userId, {
            onSuccess: () => {
              Toast.show({ type: "success", text1: t("admin.users.userDeleted") })
              setShowUserModal(false)
              refetch()
            },
            onError: (error: any) => {
              Toast.show({ type: "error", text1: t("common.error"), text2: error.message })
            },
          })
        },
      },
    ])
  }

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => handleUserPress(item)}>
      <View style={styles.userHeader}>
        <Image source={{ uri: item.avatar_url || "https://via.placeholder.com/50" }} style={styles.userAvatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullname || item.nickname || item.email}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>{item.roles?.[0]?.role_name || "Student"}</Text>
            </View>
            <Text style={styles.userLevel}>Level {item.level}</Text>
          </View>
        </View>
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <Icon name="local-fire-department" size={16} color="#F59E0B" />
            <Text style={styles.statText}>{item.streak}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="star" size={16} color="#10B981" />
            <Text style={styles.statText}>{item.exp}</Text>
          </View>
        </View>
      </View>
      <View style={styles.userFooter}>
        <Text style={styles.joinDate}>
          {t("admin.users.joined")}: {formatDateTime(item.created_at)}
        </Text>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  )

  const renderUserModal = () => (
    <Modal visible={showUserModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("admin.users.userDetails")}</Text>
            <TouchableOpacity onPress={() => setShowUserModal(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <View style={styles.modalBody}>
              <View style={styles.userDetailHeader}>
                <Image
                  source={{ uri: selectedUser.avatar_url || "https://via.placeholder.com/80" }}
                  style={styles.userDetailAvatar}
                />
                <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailName}>
                    {selectedUser.fullname || selectedUser.nickname || selectedUser.email}
                  </Text>
                  <Text style={styles.userDetailEmail}>{selectedUser.email}</Text>
                  <Text style={styles.userDetailPhone}>{selectedUser.phone || t("admin.users.noPhone")}</Text>
                </View>
              </View>

              <View style={styles.userDetailStats}>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>{selectedUser.level}</Text>
                  <Text style={styles.detailStatLabel}>{t("admin.users.level")}</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>{selectedUser.exp}</Text>
                  <Text style={styles.detailStatLabel}>{t("admin.users.exp")}</Text>
                </View>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatValue}>{selectedUser.streak}</Text>
                  <Text style={styles.detailStatLabel}>{t("admin.users.streak")}</Text>
                </View>
              </View>

              <View style={styles.actionSection}>
                <Text style={styles.actionSectionTitle}>{t("admin.users.actions")}</Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUpdateRole(selectedUser.user_id, "teacher")}
                  disabled={isUpdating}
                >
                  <Icon name="school" size={20} color="#3B82F6" />
                  <Text style={styles.actionButtonText}>{t("admin.users.makeTeacher")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUpdateRole(selectedUser.user_id, "admin")}
                  disabled={isUpdating}
                >
                  <Icon name="admin-panel-settings" size={20} color="#10B981" />
                  <Text style={styles.actionButtonText}>{t("admin.users.makeAdmin")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDeleteUser(selectedUser.user_id)}
                  disabled={isDeleting}
                >
                  <Icon name="delete" size={20} color="#EF4444" />
                  <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t("admin.users.deleteUser")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{t("admin.users.loadError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("admin.users.title")}</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <Icon name="filter-list" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("admin.users.searchPlaceholder")}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {t("admin.users.totalUsers")}: {pagination?.total || 0}
        </Text>
        <Text style={styles.statsText}>
          {t("admin.users.showing")}: {users.length}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t("admin.users.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.usersList}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (pagination && page < pagination.totalPages) {
              setPage(page + 1)
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filtersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("admin.users.filters")}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>{t("admin.users.filterByRole")}</Text>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.filterOption, selectedRole === role.id && styles.selectedFilterOption]}
                  onPress={() => handleRoleFilter(role.id)}
                >
                  <Text style={[styles.filterOptionText, selectedRole === role.id && styles.selectedFilterOptionText]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>{t("admin.users.sortBy.title")}</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.filterOption, sortBy === option.id && styles.selectedFilterOption]}
                  onPress={() => handleSort(option.id)}
                >
                  <Text style={[styles.filterOptionText, sortBy === option.id && styles.selectedFilterOptionText]}>
                    {option.label}
                  </Text>
                  {sortBy === option.id && (
                    <Icon name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"} size={16} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {renderUserModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  usersList: {
    padding: 24,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  userLevel: {
    fontSize: 12,
    color: "#6B7280",
  },
  userStats: {
    alignItems: "flex-end",
    gap: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  userFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  joinDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  filtersModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    padding: 24,
  },
  userDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  userDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userDetailInfo: {
    flex: 1,
  },
  userDetailName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  userDetailEmail: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 2,
  },
  userDetailPhone: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  userDetailStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  detailStatItem: {
    alignItems: "center",
  },
  detailStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  detailStatLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionSection: {
    marginTop: 16,
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: "#FEF2F2",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
  },
  dangerButtonText: {
    color: "#EF4444",
  },
  filterSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: "#EEF2FF",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  selectedFilterOptionText: {
    color: "#3B82F6",
    fontWeight: "500",
  },
})

export default AdminUserManagementScreen
