import React, { useState, useEffect } from "react";
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
import { UserResponse } from "../../types/dto";

const AdminUserManagementScreen = () => {
  const { t } = useTranslation();

  const { useAllUsers, useDeleteUser } = useUsers();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);

  const queryParams = searchQuery
    ? {
      email: searchQuery,
      fullname: searchQuery,
    }
    : {};

  const { data, isLoading, refetch, isFetching } = useAllUsers({
    page,
    size: 20,
    ...queryParams,
  });

  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  // Logic nối danh sách (Load More)
  useEffect(() => {
    if (data?.data) {
      // Ép kiểu dữ liệu từ API về UserResponse[] để TS không báo lỗi
      const incomingData = data.data as UserResponse[];

      if (page === 0) {
        setAllUsers(incomingData);
      } else {
        setAllUsers((prev) => {
          const newIds = new Set(incomingData.map((u) => u.userId));
          const uniquePrev = prev.filter(u => !newIds.has(u.userId));
          return [...uniquePrev, ...incomingData];
        });
      }
    }
  }, [data, page]);

  const handleSearch = () => {
    setPage(0);
    setAllUsers([]);
    refetch();
  };

  const handleDelete = (userId: string, userName: string) => {
    Alert.alert(
      t("admin.users.deleteTitle") || "Delete User",
      t("admin.users.deleteConfirm", { name: userName }) || `Delete ${userName}?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteUser(userId, {
              onSuccess: () => {
                setAllUsers((prev) => prev.filter((u) => u.userId !== userId));
              },
            });
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: UserResponse }) => (
    <View style={styles.userCard}>
      <Image
        source={{ uri: item.avatarUrl || "https://via.placeholder.com/150" }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.fullname || item.nickname || item.email?.split('@')[0] || "No Name"}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.metaRow}>
          {item.vip && (
            <View style={styles.vipTag}>
              <Text style={styles.vipText}>VIP</Text>
            </View>
          )}
          <Text style={styles.userMeta}>
            Lv.{item.level || 0} • {item.country || "Global"}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.userId, item.fullname || "User")}
        disabled={isDeleting}
      >
        <Icon name="delete-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const handleLoadMore = () => {
    // Ép kiểu data thành any để truy cập pagination mà không bị TS chặn
    const responseData = data as any;
    if (!isFetching && responseData?.pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("admin.users.searchPlaceholder") || "Search by email/name..."}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text === "") {
                setPage(0);
                refetch();
              }
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {isLoading && page === 0 ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : (
          <FlatList
            data={allUsers}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && page === 0}
                onRefresh={() => { setPage(0); refetch(); }}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetching && page > 0 ? <ActivityIndicator size="small" color="#4F46E5" style={{ margin: 10 }} /> : null
            }
            ListEmptyComponent={
              !isFetching ? (
                <Text style={styles.emptyText}>{t("admin.users.noUsers") || "No users found"}</Text>
              ) : null
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
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  userMeta: { fontSize: 12, color: "#94A3B8" },
  vipTag: { backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipText: { fontSize: 10, fontWeight: 'bold', color: '#B45309' },
  deleteBtn: { padding: 8 },
  emptyText: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});

export default AdminUserManagementScreen;