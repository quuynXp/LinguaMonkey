// import React, { useEffect, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
//   Share,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
// import { useTranslation } from "react-i18next";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// import { useChatStore } from "../../stores/ChatStore";
// import { useUserStore } from "../../stores/UserStore";
// import instance from "../../api/axiosClient";
// import { createScaledSheet } from "../../utils/scaledStyles";
// import ScreenLayout from "../../components/layout/ScreenLayout";

// // --- Kiểu dữ liệu từ API (Dựa trên schema và controller) ---
// type ApiRoomInfo = {
//   roomId: string;
//   roomName: string;
//   description: string;
//   purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT' | 'AI_CHAT';
//   roomType: 'PUBLIC' | 'PRIVATE';
//   creatorId: string;
//   memberCount: number;
//   // ... (Các trường khác từ RoomResponse.java)
// };

// type ApiMember = {
//   userId: string;
//   username: string; // Giả định MemberResponse có trường này
//   avatarUrl: string | null; // Giả định MemberResponse có trường này
//   role: 'MEMBER' | 'ADMIN' | 'MODERATOR'; // Giả định MemberResponse có trường này
//   isOnline: boolean; // Giả định MemberResponse có trường này
// };

// type ChatRoomParams = {
//   ChatRoom: {
//     roomId: string;
//     roomName: string; // Tên ban đầu
//   };
// };

// type Message = {
//   chatMessageId: string;
//   roomId: string;
//   senderId: string;
//   content: string;
//   sentAt: string;
//   purpose: 'GROUP_CHAT' | 'PRIVATE_CHAT';
//   translatedText?: string;
//   reactions?: any;
// };

// const GroupChatScreen = () => {
//   const { t } = useTranslation();
//   const navigation = useNavigation();
//   const route = useRoute<RouteProp<ChatRoomParams, 'ChatRoom'>>();
//   const queryClient = useQueryClient();

//   const { roomId, roomName: initialRoomName } = route.params;
//   const { user } = useUserStore();

//   // --- STATE CỤC BỘ CHO UI ---
//   const [inputText, setInputText] = useState("");
//   const [showRoomSettings, setShowRoomSettings] = useState(false);
//   const [localTranslations, setLocalTranslations] = useState<{ [msgId: string]: string }>({});
//   const [showMembersList, setShowMembersList] = useState(false);
//   const [editingRoomName, setEditingRoomName] = useState(false);
//   const [newRoomName, setNewRoomName] = useState(initialRoomName);

//   // --- STATE TỪ ZUSTAND STORE (CHO CHAT) ---
//   const isLoadingMessages = useChatStore(s => s.isLoadingMessages[roomId]);
//   const typingStatus = useChatStore(s => s.typingStatusByRoom[roomId]);
//   const serverMessages = useChatStore(s => s.messagesByRoom[roomId] || []);

//   // --- ACTIONS TỪ ZUSTAND STORE (CHO CHAT) ---
//   const loadAndSubscribe = useChatStore(s => s.loadAndSubscribeToRoom);
//   const unsubscribe = useChatStore(s => s.unsubscribeFromRoom);
//   const sendGroupMessage = useChatStore(s => s.sendGroupMessage);
//   const sendTypingStatus = useChatStore(s => s.sendTypingStatus);
//   const reactToMessage = useChatStore(s => s.reactToMessage);

//   const flatListRef = useRef<FlatList>(null);

//   // --- GỌI API LẤY THÔNG TIN PHÒNG (THAY CHO MOCK) ---
//   const { data: roomInfo, isLoading: isLoadingRoomInfo } = useQuery<ApiRoomInfo>({
//     queryKey: ['roomInfo', roomId],
//     queryFn: async () => {
//       const response = await instance.get(`/api/v1/rooms/${roomId}`);
//       return response.data.result; // Dựa theo AppApiResponse
//     },
//     onSuccess: (data) => {
//       if (data) {
//         setNewRoomName(data.roomName);
//       }
//     }
//   });

//   // --- GỌI API LẤY THÀNH VIÊN (THAY CHO MOCK) ---
//   const { data: members = [], isLoading: isLoadingMembers } = useQuery<ApiMember[]>({
//     queryKey: ['roomMembers', roomId],
//     queryFn: async () => {
//       // GET /api/v1/rooms/{roomId}/members (API bạn vừa thêm ở bước 1)
//       const response = await instance.get(`/api/v1/rooms/${roomId}/members`);
//       return response.data.result;
//     },
//     enabled: !!roomId, // Chỉ chạy khi có roomId
//   });

//   // --- API DỊCH (GIỮ NGUYÊN) ---
//   const { mutate: translateMutate, isPending: isTranslating } = useMutation({
//     mutationFn: async ({ text, targetLanguage, messageId }: { text: string, targetLanguage: string, messageId: string }) => {
//       const response = await instance.post('/api/py/translate', {
//         text,
//         target_lang: targetLanguage
//       });
//       return { translated_text: response.data.translated_text, messageId };
//     },
//     onSuccess: (data) => {
//       setLocalTranslations(prev => ({ ...prev, [data.messageId]: data.translated_text }));
//     },
//     onError: () => { Alert.alert(t('error'), t('translation.error')); }
//   });

//   // --- API CẬP NHẬT TÊN PHÒNG (THAY CHO TODO) ---
//   const { mutate: updateRoomNameMutate, isPending: isUpdatingRoom } = useMutation({
//     mutationFn: (newName: string) => {
//       // PUT /api/v1/rooms/{id} (Từ RoomController)
//       const payload = {
//         roomName: newName,
//         creatorId: roomInfo?.creatorId,
//         maxMembers: roomInfo?.memberCount, // Giữ lại giá trị cũ
//         purpose: roomInfo?.purpose,
//         roomType: roomInfo?.roomType,
//         description: roomInfo?.description
//       };
//       return instance.put(`/api/v1/rooms/${roomId}`, payload);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['roomInfo', roomId] });
//       setEditingRoomName(false);
//     },
//     onError: () => { Alert.alert(t('error'), t('group.nameUpdateError')); }
//   });

//   // --- API KICK THÀNH VIÊN (THAY CHO TODO) ---
//   const { mutate: kickMemberMutate, isPending: isKicking } = useMutation({
//     mutationFn: (userIdToKick: string) => {
//       // DELETE /api/v1/rooms/{id}/members (Từ RoomController)
//       return instance.delete(`/api/v1/rooms/${roomId}/members`, {
//         data: [userIdToKick] // Body là một mảng UUID [string]
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
//       queryClient.invalidateQueries({ queryKey: ['roomInfo', roomId] }); // Tải lại cả thông tin phòng (để cập nhật memberCount)
//       Alert.alert(t("success"), t("group.kick.success"));
//     },
//     onError: () => { Alert.alert(t('error'), t('group.kick.error')); }
//   });

//   // --- KẾT HỢP DATA ---
//   const messages = serverMessages.map((msg: Message) => {
//     const localTranslation = localTranslations[msg.chatMessageId];
//     const senderInfo = members.find(m => m.userId === msg.senderId);
//     return {
//       ...msg,
//       id: msg.chatMessageId,
//       sender: msg.senderId === user?.id ? 'user' : 'other',
//       timestamp: new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
//       text: msg.content,
//       translatedText: localTranslation || msg.translatedText,
//       translated: !!(localTranslation || msg.translatedText),
//       user: senderInfo?.username || msg.senderId,
//       avatar: senderInfo?.avatarUrl || '👩',
//     };
//   });

//   // --- EFFECTS ---
//   useEffect(() => {
//     loadAndSubscribe(roomId);
//     return () => {
//       unsubscribe(roomId);
//     };
//   }, [roomId, loadAndSubscribe, unsubscribe]);

//   useEffect(() => {
//     if (messages.length > 0) {
//       flatListRef.current?.scrollToEnd({ animated: true });
//     }
//   }, [messages.length]);

//   // --- HANDLERS (Store-connected) ---
//   const handleSendMessage = () => {
//     if (inputText.trim() === "") return;
//     sendGroupMessage(roomId, {
//       content: inputText,
//       purpose: roomInfo?.purpose || 'GROUP_CHAT'
//     });
//     setInputText("");
//     sendTypingStatus(roomId, false);
//   };

//   const handleTyping = (text: string) => {
//     setInputText(text);
//     sendTypingStatus(roomId, text.length > 0);
//   };

//   const handleTranslate = (messageId: string, messageText: string) => {
//     translateMutate({ messageId, text: messageText, targetLanguage: 'vi' });
//   };

//   const handleReact = (messageId: string) => {
//     const reaction = "👍";
//     reactToMessage(messageId, reaction);
//   };

//   // --- UI Handlers (Đã kết nối API) ---
//   const shareRoomId = async () => {
//     if (!roomInfo) return;
//     try {
//       await Share.share({
//         message: t("group.share.message", { roomId: roomInfo.roomId, description: roomInfo.description }),
//         title: t("group.share.title"),
//       });
//     } catch (error) { console.error("Error sharing:", error); }
//   };

//   const handleUpdateRoomName = () => {
//     if (newRoomName.trim() === "" || newRoomName === roomInfo?.roomName) {
//       setEditingRoomName(false);
//       return;
//     }
//     updateRoomNameMutate(newRoomName.trim());
//   };

//   const handleKickMember = (member: ApiMember) => {
//     Alert.alert(t("group.kick.confirm"), t("group.kick.confirm.message", { name: member.username }), [
//       { text: t("cancel"), style: "cancel" },
//       {
//         text: t("confirm"),
//         style: "destructive",
//         onPress: () => kickMemberMutate(member.userId),
//       },
//     ]);
//   };

//   const isUserAdmin = roomInfo?.creatorId === user?.id; // Logic check admin

//   // --- RENDER ---
//   const renderMessage = ({ item: message }: { item: (typeof messages)[0] }) => (
//     <View
//       style={[
//         styles.messageContainer,
//         message.sender === "user" ? styles.userMessageContainer : styles.otherMessageContainer,
//       ]}
//     >
//       {message.sender === "other" && (
//         <View style={styles.messageHeader}>
//           {/* TODO: Thay 'Text' bằng 'Image' cho avatarUrl */}
//           <Text style={styles.avatar}>{message.avatar}</Text>
//           <Text style={styles.senderName}>{message.user}</Text>
//         </View>
//       )}

//       <TouchableOpacity onLongPress={() => handleReact(message.id)}>
//         <View style={[styles.messageBubble, message.sender === "user" ? styles.userMessage : styles.otherMessage]}>
//           <Text style={[styles.messageText, message.sender === "user" ? styles.userMessageText : styles.otherMessageText]}>
//             {message.translated ? message.translatedText : message.text}
//           </Text>
//           <Text style={[styles.timestamp, message.sender === "user" ? styles.userTimestamp : styles.otherTimestamp]}>
//             {message.timestamp}
//           </Text>
//         </View>
//       </TouchableOpacity>

//       {message.sender === "other" && !message.translated && (
//         <TouchableOpacity
//           style={styles.translateButton}
//           onPress={() => handleTranslate(message.id, message.text)}
//           disabled={isTranslating}
//         >
//           {isTranslating ? <ActivityIndicator size="small" color="#6B7280" /> : <Icon name={"language"} size={16} color="#6B7280" />}
//         </TouchableOpacity>
//       )}
//     </View>
//   );

//   const renderMember = ({ item: member }: { item: ApiMember }) => (
//     <View style={styles.memberItem}>
//       <View style={styles.memberInfo}>
//         {/* TODO: Thay 'Text' bằng 'Image' cho avatarUrl */}
//         <Text style={styles.memberAvatar}>{member.avatarUrl || '👩'}</Text>
//         <View style={styles.memberDetails}>
//           <Text style={styles.memberName}>{member.username}</Text>
//           <View style={styles.memberStatus}>
//             <View style={[styles.onlineIndicator, { backgroundColor: member.isOnline ? "#10B981" : "#6B7280" }]} />
//             <Text style={styles.memberRole}>{t(member.role.toLowerCase())}</Text>
//           </View>
//         </View>
//       </View>

//       {isUserAdmin && member.userId !== user?.id && (
//         <TouchableOpacity style={styles.kickButton} onPress={() => handleKickMember(member)} disabled={isKicking}>
//           <Icon name="person-remove-outline" size={18} color="#EF4444" />
//         </TouchableOpacity>
//       )}
//     </View>
//   );

//   return (
//     <ScreenLayout>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
//       >
//         <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
//           {/* Header */}
//           <View style={styles.header}>
//             <TouchableOpacity onPress={() => navigation.goBack()}>
//               <Icon name="arrow-back" size={24} color="#374151" />
//             </TouchableOpacity>
//             <View style={styles.roomInfo}>
//               <Text style={styles.roomName}>{roomInfo?.roomName || initialRoomName}</Text>
//               {typingStatus?.isTyping && typingStatus.userId !== user?.id ? (
//                 <Text style={styles.memberCount} numberOfLines={1}>{typingStatus.userId} {t("is typing...")}</Text>
//               ) : (
//                 <Text style={styles.memberCount}>{roomInfo?.memberCount || 0} {t("group.members")}</Text>
//               )}
//             </View>
//             <TouchableOpacity style={styles.headerButton} onPress={() => setShowRoomSettings(true)}>
//               <Icon name="settings-outline" size={22} color="#6B7280" />
//             </TouchableOpacity>
//           </View>

//           {/* Messages */}
//           {(isLoadingMessages || isLoadingRoomInfo) && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
//           <FlatList
//             ref={flatListRef}
//             data={messages}
//             renderItem={renderMessage}
//             keyExtractor={(item) => item.id}
//             style={styles.messagesContainer}
//             onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
//             showsVerticalScrollIndicator={false}
//           />

//           {/* Input */}
//           <View style={styles.inputContainer}>
//             <TextInput
//               style={styles.input}
//               placeholder={t("group.input.placeholder")}
//               value={inputText}
//               onChangeText={handleTyping}
//               onSubmitEditing={handleSendMessage}
//               returnKeyType="send"
//               multiline
//             />
//             <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
//               <Icon name="send" size={20} color="#FFFFFF" />
//             </TouchableOpacity>
//           </View>

//           {/* Room Settings Modal */}
//           <Modal
//             visible={showRoomSettings}
//             transparent={true}
//             animationType="slide"
//             onRequestClose={() => setShowRoomSettings(false)}
//           >
//             <View style={styles.modalOverlay}>
//               <View style={styles.modalContent}>
//                 <View style={styles.modalHeader}>
//                   <Text style={styles.modalTitle}>{t("group.settings")}</Text>
//                   <TouchableOpacity onPress={() => setShowRoomSettings(false)}>
//                     <Icon name="close" size={24} color="#374151" />
//                   </TouchableOpacity>
//                 </View>
//                 {isLoadingRoomInfo || !roomInfo ? <ActivityIndicator style={{ padding: 20 }} /> : (
//                   <View style={styles.settingsContent}>
//                     {/* Room Name */}
//                     <View style={styles.settingItem}>
//                       <Icon name="chatbubbles-outline" size={20} color="#6B7280" />
//                       <View style={styles.settingInfo}>
//                         <Text style={styles.settingLabel}>{t("group.name")}</Text>
//                         {editingRoomName ? (
//                           <View style={styles.editNameContainer}>
//                             <TextInput
//                               style={styles.editNameInput}
//                               value={newRoomName}
//                               onChangeText={setNewRoomName}
//                               onSubmitEditing={handleUpdateRoomName}
//                               autoFocus
//                             />
//                             <TouchableOpacity onPress={handleUpdateRoomName} disabled={isUpdatingRoom}>
//                               {isUpdatingRoom ? <ActivityIndicator size="small" /> : <Icon name="checkmark" size={20} color="#10B981" />}
//                             </TouchableOpacity>
//                           </View>
//                         ) : (
//                           <TouchableOpacity onPress={() => setEditingRoomName(isUserAdmin)}>
//                             <Text style={styles.settingValue}>{roomInfo.roomName}</Text>
//                           </TouchableOpacity>
//                         )}
//                       </View>
//                     </View>
//                     {/* Members */}
//                     <TouchableOpacity style={styles.settingItem} onPress={() => setShowMembersList(true)}>
//                       <Icon name="people-outline" size={20} color="#6B7280" />
//                       <View style={styles.settingInfo}>
//                         <Text style={styles.settingLabel}>{t("group.members")}</Text>
//                         <Text style={styles.settingValue}>
//                           {roomInfo.memberCount} {t("people")}
//                         </Text>
//                       </View>
//                       <Icon name="chevron-forward" size={16} color="#9CA3AF" />
//                     </TouchableOpacity>
//                     {/* Room ID */}
//                     <View style={styles.settingItem}>
//                       <Icon name="key-outline" size={20} color="#6B7280" />
//                       <View style={styles.settingInfo}>
//                         <Text style={styles.settingLabel}>{t("group.id")}</Text>
//                         <Text style={styles.settingValue}>{roomInfo.roomId}</Text>
//                       </View>
//                       <TouchableOpacity onPress={shareRoomId} style={styles.shareButton}>
//                         <Icon name="share-outline" size={18} color="#3B82F6" />
//                       </TouchableOpacity>
//                     </View>
//                     {/* Description */}
//                     <View style={styles.settingItem}>
//                       <Icon name="document-text-outline" size={20} color="#6B7280" />
//                       <View style={styles.settingInfo}>
//                         <Text style={styles.settingLabel}>{t("group.desc")}</Text>
//                         <Text style={styles.settingValue}>{roomInfo.description}</Text>
//                       </View>
//                     </View>
//                     {/* Action Buttons */}
//                     <View style={styles.actionButtons}>
//                       <TouchableOpacity style={styles.actionButton} onPress={shareRoomId}>
//                         <Icon name="share-outline" size={20} color="#3B82F6" />
//                         <Text style={styles.actionButtonText}>{t("group.share")}</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity style={styles.actionButton}>
//                         <Icon name="notifications-outline" size={20} color="#3B82F6" />
//                         <Text style={styles.actionButtonText}>{t("group.notifications")}</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
//                         <Icon name="exit-outline" size={20} color="#EF4444" />
//                         <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t("group.leave")}</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </View>
//                 )}
//               </View>
//             </View>
//           </Modal>

//           {/* Members List Modal */}
//           <Modal
//             visible={showMembersList}
//             transparent={true}
//             animationType="slide"
//             onRequestClose={() => setShowMembersList(false)}
//           >
//             <View style={styles.modalOverlay}>
//               <View style={styles.modalContent}>
//                 <View style={styles.modalHeader}>
//                   <Text style={styles.modalTitle}>{t("group.members.list")}</Text>
//                   <TouchableOpacity onPress={() => setShowMembersList(false)}>
//                     <Icon name="close" size={24} color="#374151" />
//                   </TouchableOpacity>
//                 </View>
//                 {isLoadingMembers ? <ActivityIndicator style={{ padding: 20 }} /> :
//                   <FlatList
//                     data={members}
//                     renderItem={renderMember}
//                     keyExtractor={(item) => item.userId}
//                     style={styles.membersList}
//                   />
//                 }
//               </View>
//             </View>
//           </Modal>
//         </View>
//       </KeyboardAvoidingView>
//     </ScreenLayout>
//   );
// };

// // Dán styles từ file 'GroupChatRoomScreen.ts' cũ của bạn vào đây
// const styles = createScaledSheet({
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingTop: 50,
//     paddingBottom: 12,
//     backgroundColor: "#FFFFFF",
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   roomInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   roomName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1F2937",
//   },
//   memberCount: {
//     fontSize: 12,
//     color: "#6B7280",
//     marginTop: 2,
//   },
//   headerButton: {
//     padding: 8,
//   },
//   messagesContainer: {
//     flex: 1,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//   },
//   messageContainer: {
//     marginBottom: 16,
//   },
//   userMessageContainer: {
//     alignItems: "flex-end",
//   },
//   otherMessageContainer: {
//     alignItems: "flex-start",
//   },
//   messageHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 4,
//     marginLeft: 4,
//   },
//   avatar: {
//     fontSize: 16,
//     marginRight: 6,
//   },
//   senderName: {
//     fontSize: 12,
//     color: "#6B7280",
//     fontWeight: "500",
//   },
//   messageBubble: {
//     maxWidth: "75%",
//     borderRadius: 16,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   userMessage: {
//     backgroundColor: "#3B82F6",
//   },
//   otherMessage: {
//     backgroundColor: "#F3F4F6",
//   },
//   messageText: {
//     fontSize: 16,
//     lineHeight: 20,
//   },
//   userMessageText: {
//     color: "#FFFFFF",
//   },
//   otherMessageText: {
//     color: "#1F2937",
//   },
//   timestamp: {
//     fontSize: 11,
//     marginTop: 4,
//   },
//   userTimestamp: {
//     color: "rgba(255, 255, 255, 0.7)",
//   },
//   otherTimestamp: {
//     color: "#9CA3AF",
//   },
//   translateButton: {
//     marginTop: 4,
//     padding: 6,
//     borderRadius: 12,
//     backgroundColor: "#F9FAFB",
//     alignSelf: "flex-start",
//   },
//   inputContainer: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: "#FFFFFF",
//     borderTopWidth: 1,
//     borderTopColor: "#E5E7EB",
//   },
//   input: {
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//     borderRadius: 20,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     marginRight: 8,
//     maxHeight: 100,
//     fontSize: 16,
//   },
//   sendButton: {
//     backgroundColor: "#3B82F6",
//     borderRadius: 20,
//     padding: 10,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0, 0, 0, 0.5)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: "#FFFFFF",
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     maxHeight: "80%",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1F2937",
//   },
//   settingsContent: {
//     padding: 20,
//   },
//   settingItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#F3F4F6",
//   },
//   settingInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   settingLabel: {
//     fontSize: 14,
//     color: "#6B7280",
//   },
//   settingValue: {
//     fontSize: 16,
//     color: "#1F2937",
//     marginTop: 2,
//   },
//   editNameContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 2,
//   },
//   editNameInput: {
//     flex: 1,
//     fontSize: 16,
//     color: "#1F2937",
//     borderBottomWidth: 1,
//     borderBottomColor: "#3B82F6",
//     paddingVertical: 2,
//   },
//   shareButton: {
//     padding: 8,
//   },
//   actionButtons: {
//     marginTop: 20,
//   },
//   actionButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     marginBottom: 8,
//     backgroundColor: "#F9FAFB",
//   },
//   dangerButton: {
//     backgroundColor: "#FEF2F2",
//   },
//   actionButtonText: {
//     fontSize: 16,
//     color: "#3B82F6",
//     marginLeft: 8,
//   },
//   dangerButtonText: {
//     color: "#EF4444",
//   },
//   membersList: {
//     maxHeight: 400,
//   },
//   memberItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#F3F4F6",
//   },
//   memberInfo: {
//     flexDirection: "row",
//     alignItems: "center",
//     flex: 1,
//   },
//   memberAvatar: {
//     fontSize: 20,
//     marginRight: 12,
//   },
//   memberDetails: {
//     flex: 1,
//   },
//   memberName: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#1F2937",
//   },
//   memberStatus: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 2,
//   },
//   onlineIndicator: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     marginRight: 6,
//   },
//   memberRole: {
//     fontSize: 12,
//     color: "#6B7280",
//   },
//   kickButton: {
//     padding: 8,
//     borderRadius: 6,
//     backgroundColor: "#FEF2F2",
//   },
// });

// export default GroupChatScreen;