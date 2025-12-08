import { useNavigation } from '@react-navigation/native';
import { useVideoCalls } from '../hooks/useVideos';
import { VideoCallType } from '../types/enums';
import { useUserStore } from '../stores/UserStore';
import { Alert } from 'react-native';

export const useGroupCallLogic = () => {
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const { mutate: createGroupCall, isPending } = useVideoCalls().useCreateGroupCall();

    // Hàm gọi khi bấm nút Call trên Header
    const startGroupCall = (roomId: string, currentMembers: string[]) => {
        if (!user?.userId) return;

        // Lọc ra danh sách người nhận (trừ mình ra)
        const participants = currentMembers.filter(id => id !== user.userId);

        createGroupCall(
            {
                callerId: user.userId,
                participantIds: participants,
                videoCallType: VideoCallType.GROUP,
                // Nếu API yêu cầu roomId để link, hãy thêm vào DTO backend, 
                // hoặc backend tự tạo room mới như code Java hiện tại.
                // Ở đây giả sử backend tạo room mới cho cuộc gọi.
            },
            {
                onSuccess: (data) => {
                    // Người GỌI: Nhảy vào màn hình Call ngay lập tức
                    navigation.navigate("WebRTCCallScreen", {
                        roomId: data.roomId, // RoomID socket để signaling
                        videoCallId: data.videoCallId,
                        isCaller: true, // Flag quan trọng
                        mode: 'GROUP'   // Flag để phân biệt logic
                    });
                },
                onError: (err) => {
                    Alert.alert("Error", "Could not start call");
                }
            }
        );
    };

    // Hàm xử lý khi nhận Socket Message "INCOMING_CALL"
    const handleIncomingCall = (payload: any) => {
        // Check nếu payload.callerId !== user.userId
        if (payload.type === 'INCOMING_CALL') {
            navigation.navigate("WebRTCCallScreen", {
                roomId: payload.roomId,
                videoCallId: payload.videoCallId,
                isCaller: false,
                mode: 'GROUP'
            });
        }
    };

    return { startGroupCall, handleIncomingCall, isLoading: isPending };
};