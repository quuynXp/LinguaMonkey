import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { createScaledSheet } from '../../utils/scaledStyles';
import { useUsers } from '../../hooks/useUsers';
import { useUserStore } from '../../stores/UserStore';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { UserResponse } from '../../types/dto';
import * as Enums from '../../types/enums';

// Fix 1: Define component first, then memoize, and set displayName
const UserItemComponent = ({
    user,
    onEdit,
    onDelete
}: {
    user: UserResponse;
    onEdit: (u: UserResponse) => void;
    onDelete: (id: string) => void
}) => {
    return (
        <View style={styles.userCard}>
            <Image
                source={{ uri: user.avatarUrl || 'https://via.placeholder.com/100' }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={styles.fullname} numberOfLines={1}>{user.nickname || user.fullname || 'Unknown'}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                <View style={styles.badgesRow}>
                    <View style={[styles.badge, { backgroundColor: '#E0E7FF' }]}>
                        <Text style={[styles.badgeText, { color: '#4F46E5' }]}>Lv.{user.level ?? 0}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7', marginLeft: 6 }]}>
                        <Text style={[styles.badgeText, { color: '#D97706' }]}>{user.country ?? 'Global'}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(user)}>
                    <Icon name="edit" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => onDelete(user.userId)}>
                    <Icon name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const UserItem = React.memo(UserItemComponent);
UserItem.displayName = 'UserItem';

const EditUserModal = ({ visible, user, onClose, onSave, isSaving }: any) => {
    const [formData, setFormData] = useState({
        fullname: user?.fullname || '',
        nickname: user?.nickname || '',
        country: user?.country || Enums.Country.VIETNAM,
    });

    React.useEffect(() => {
        if (user) {
            setFormData({
                fullname: user.fullname || '',
                nickname: user.nickname || '',
                country: user.country || Enums.Country.VIETNAM,
            });
        }
    }, [user]);

    const handleSave = () => {
        onSave(user.userId, formData);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit User</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.fullname}
                            onChangeText={(t) => setFormData(p => ({ ...p, fullname: t }))}
                            placeholder="Enter full name"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nickname</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.nickname}
                            onChangeText={(t) => setFormData(p => ({ ...p, nickname: t }))}
                            placeholder="Enter nickname"
                        />
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const EnhancedUserManagement: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const currentUser = useUserStore(state => state.user);

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [editUser, setEditUser] = useState<UserResponse | null>(null);
    const [isEditModalVisible, setEditModalVisible] = useState(false);

    // Hooks
    const { useAllUsers, useUpdateUser, useDeleteUser } = useUsers();

    // Data Query
    const { data: usersData, isLoading, refetch, isRefetching } = useAllUsers({
        nickname: searchTerm || undefined, // Simple search by nickname
        page,
        size: 10,
    });

    // Mutations
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const handleSearch = (text: string) => {
        setSearchTerm(text);
        setPage(0);
    };

    const handleEdit = useCallback((user: UserResponse) => {
        setEditUser(user);
        setEditModalVisible(true);
    }, []);

    const handleDelete = useCallback((id: string) => {
        if (id === currentUser?.userId) {
            Alert.alert("Action Denied", "You cannot delete your own account from here.");
            return;
        }

        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this user? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteMutation.mutate(id, {
                            onSuccess: () => {
                                Alert.alert("Success", "User deleted successfully");
                                refetch();
                            },
                            onError: () => Alert.alert("Error", "Failed to delete user"),
                        });
                    },
                },
            ]
        );
    }, [deleteMutation, refetch, currentUser?.userId]);

    const handleSaveEdit = (id: string, data: any) => {
        updateMutation.mutate({ id, req: data }, {
            onSuccess: () => {
                setEditModalVisible(false);
                setEditUser(null);
                refetch();
                Alert.alert("Success", "User updated successfully");
            },
            onError: (err: any) => {
                Alert.alert("Error", err?.message || "Failed to update user");
            }
        });
    };

    const paginationInfo = usersData?.pagination;

    // Fix 2: Cast data to UserResponse[] to satisfy TypeScript since the hook might return unknown[]
    const userList = (usersData?.data as unknown as UserResponse[]) || [];

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>{t('settings.userManagement') || 'User Management'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.container}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Icon name="search" size={24} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by nickname..."
                        value={searchTerm}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Icon name="close" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* User List - Fix 2: Explicit Generic and Key Extractor */}
                <FlatList<UserResponse>
                    data={userList}
                    keyExtractor={(item) => item.userId}
                    renderItem={({ item }) => (
                        <UserItem user={item} onEdit={handleEdit} onDelete={handleDelete} />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#4F46E5']} />
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyContainer}>
                                <Icon name="person-off" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={
                        isLoading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} /> : null
                    }
                />

                {/* Pagination Controls */}
                {paginationInfo && (
                    <View style={styles.paginationContainer}>
                        <TouchableOpacity
                            disabled={paginationInfo.isFirst}
                            onPress={() => setPage(p => Math.max(0, p - 1))}
                            style={[styles.pageBtn, paginationInfo.isFirst && styles.pageBtnDisabled]}
                        >
                            <Icon name="chevron-left" size={24} color={paginationInfo.isFirst ? "#D1D5DB" : "#4B5563"} />
                        </TouchableOpacity>

                        <Text style={styles.pageText}>
                            Page {paginationInfo.pageNumber + 1} of {paginationInfo.totalPages || 1}
                        </Text>

                        <TouchableOpacity
                            disabled={paginationInfo.isLast}
                            onPress={() => setPage(p => p + 1)}
                            style={[styles.pageBtn, paginationInfo.isLast && styles.pageBtnDisabled]}
                        >
                            <Icon name="chevron-right" size={24} color={paginationInfo.isLast ? "#D1D5DB" : "#4B5563"} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Edit Modal */}
            {editUser && (
                <EditUserModal
                    visible={isEditModalVisible}
                    user={editUser}
                    onClose={() => setEditModalVisible(false)}
                    onSave={handleSaveEdit}
                    isSaving={updateMutation.isPending}
                />
            )}
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: { padding: 8, marginLeft: -8 },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },
    container: { flex: 1, backgroundColor: '#F9FAFB' },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 48,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#111827' },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' },
    userInfo: { flex: 1, marginLeft: 12 },
    fullname: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    userEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    badgesRow: { flexDirection: 'row', marginTop: 6 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    actions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { padding: 8, borderRadius: 8, marginLeft: 8, backgroundColor: '#F3F4F6' },

    // Empty State
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 16 },

    // Pagination
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    pageBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
    pageBtnDisabled: { backgroundColor: '#F9FAFB' },
    pageText: { fontSize: 14, fontWeight: '600', color: '#374151' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
    },
    modalFooter: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 },
    cancelButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
    cancelButtonText: { color: '#374151', fontWeight: '600', fontSize: 16 },
    saveButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
    saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});

export default EnhancedUserManagement;