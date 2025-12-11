import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUsers } from '../../hooks/useUsers';
import { useFriendships } from '../../hooks/useFriendships';
import { FriendshipStatus } from '../../types/enums';
import { getAvatarSource } from '../../utils/avatarUtils';

export const MiniUserProfile = ({ userId, currentUserId, onClose, onAdmireSuccess, t }: any) => {
    const { useUserProfile, useAdmireUser } = useUsers();
    const { useCreateFriendship, useDeleteFriendship } = useFriendships();

    const { data: profile, isLoading } = useUserProfile(userId);
    const admireMutation = useAdmireUser();
    const createFriendshipMutation = useCreateFriendship();
    const deleteFriendshipMutation = useDeleteFriendship();

    if (isLoading || !profile) return <ActivityIndicator color="#4f46e5" />;

    const isFriend = profile.isFriend;
    const hasSentRequest = profile.friendRequestStatus?.hasSentRequest;

    const handleAddFriend = () => {
        createFriendshipMutation.mutate({
            requesterId: currentUserId,
            receiverId: userId,
            status: FriendshipStatus.PENDING
        });
    };

    const handleAdmire = () => {
        if (!profile.hasAdmired) {
            admireMutation.mutate(userId, { onSuccess: onAdmireSuccess });
        }
    };

    return (
        <View style={{ backgroundColor: '#1f2937', padding: 20, borderRadius: 16, alignItems: 'center', width: '80%' }}>
            <Image
                source={getAvatarSource(profile.avatarUrl, profile.gender)}
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 10 }}
            />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{profile.fullname}</Text>
            <Text style={{ color: '#9ca3af', marginBottom: 15 }}>@{profile.nickname}</Text>

            <View style={{ flexDirection: 'row', gap: 15 }}>
                {/* Nút Kết bạn */}
                {!isFriend && (
                    <TouchableOpacity
                        onPress={handleAddFriend}
                        disabled={hasSentRequest}
                        style={{ backgroundColor: hasSentRequest ? '#4b5563' : '#2563eb', padding: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                    >
                        <Icon name={hasSentRequest ? "check" : "person-add"} size={20} color="white" />
                        <Text style={{ color: 'white' }}>{hasSentRequest ? t('sent') : t('add_friend')}</Text>
                    </TouchableOpacity>
                )}

                {/* Nút Admire */}
                <TouchableOpacity
                    onPress={handleAdmire}
                    style={{ backgroundColor: profile.hasAdmired ? '#db2777' : '#fbcfe8', padding: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                    <Icon name="favorite" size={20} color={profile.hasAdmired ? 'white' : '#db2777'} />
                    <Text style={{ color: profile.hasAdmired ? 'white' : '#db2777' }}>{profile.admirationCount}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
                <Text style={{ color: '#9ca3af' }}>{t('close')}</Text>
            </TouchableOpacity>
        </View>
    );
};