import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useUsers } from "../../hooks/useUsers";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";

const AdminUserManagementScreen = () => {
  const { t } = useTranslation();
  const { useAllUsers, useDeleteUser } = useUsers();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Chỉ gửi các tham số lọc nếu searchQuery có giá trị.
  // Nếu searchQuery là chuỗi rỗng (''), các tham số sẽ là undefined và bị bỏ qua.
  const queryParams = searchQuery
    ? {
      email: searchQuery,
      fullname: searchQuery,
      nickname: searchQuery,
    }
    : {};

  const { data, isLoading, refetch, isFetching } = useAllUsers({
    page,
    size: 20,
    ...queryParams,
  });

  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const handleSearch = () => {
    setPage(0);
    refetch();
  };

  const handleDelete = (userId: string, userName: string) => {
    Alert.alert(
      t("admin.users.deleteTitle"),
      t("admin.users.deleteConfirm", { name: userName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteUser(userId),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <Image
        source={{ uri: item.avatarUrl || "https://via.placeholder.com/50" }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullname || item.nickname || "No Name"}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userMeta}>
          Level {item.level || 0} • {item.country || "Unknown"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.userId, item.fullname)}
        disabled={isDeleting}
      >
        <Icon name="delete-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("admin.users.searchPlaceholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>

        {isLoading && page === 0 ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : (
          <FlatList
            data={data?.data}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} />
            }
            onEndReached={() => {
              if (data?.pagination?.hasNext) setPage((prev) => prev + 1);
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("admin.users.noUsers")}</Text>
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B" },
  loader: { marginTop: 40 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9" },
  userInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  userEmail: { fontSize: 13, color: "#64748B", marginTop: 2 },
  userMeta: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  deleteBtn: { padding: 8 },
  emptyText: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});

export default AdminUserManagementScreen;