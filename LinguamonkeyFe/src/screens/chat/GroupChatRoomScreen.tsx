"use client"

import { useNavigation, useRoute } from "@react-navigation/native"
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { translateText } from "../api/openai"

const GroupChatRoomScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Chào mọi người! Hôm nay chúng ta học gì nhỉ?",
      sender: "other",
      timestamp: "10:30",
      user: "Minh Anh",
      avatar: "👩",
    },
    {
      id: 2,
      text: "Tôi muốn luyện tập phát âm tiếng Anh",
      sender: "other",
      timestamp: "10:32",
      user: "Hoàng Nam",
      avatar: "👨",
    },
    { id: 3, text: "Ý tưởng hay đó! Chúng ta có thể thực hành cùng nhau", sender: "user", timestamp: "10:35" },
    {
      id: 4,
      text: "Let's practice English pronunciation together!",
      sender: "other",
      timestamp: "10:37",
      user: "Sarah",
      avatar: "👱‍♀️",
    },
  ])
  const [inputText, setInputText] = useState("")
  const [showRoomSettings, setShowRoomSettings] = useState(false)
  const [translatingMessageId, setTranslatingMessageId] = useState(null)
  const [roomInfo, setRoomInfo] = useState({
    name: "Nhóm học tiếng Anh",
    members: 15,
    onlineMembers: 8,
    roomId: "ROOM789ABC",
    isAdmin: true,
    canKick: true,
    description: "Nhóm luyện tập tiếng Anh hàng ngày",
  })
  const [editingRoomName, setEditingRoomName] = useState(false)
  const [newRoomName, setNewRoomName] = useState(roomInfo.name)
  const [showMembersList, setShowMembersList] = useState(false)

  const flatListRef = useRef()
  const navigation = useNavigation()
  const route = useRoute()

  const members = [
    { id: 1, name: "Minh Anh", avatar: "👩", isOnline: true, role: "member" },
    { id: 2, name: "Hoàng Nam", avatar: "👨", isOnline: true, role: "member" },
    { id: 3, name: "Sarah", avatar: "👱‍♀️", isOnline: true, role: "moderator" },
    { id: 4, name: "David", avatar: "👨‍🦱", isOnline: false, role: "member" },
    { id: 5, name: "Lisa", avatar: "👩‍🦰", isOnline: true, role: "member" },
  ]

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  const sendMessage = () => {
    if (inputText.trim() === "") return

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prevMessages) => [...prevMessages, newMessage])
    setInputText("")
  }

  const translateMessage = async (messageId, messageText) => {
    setTranslatingMessageId(messageId)
    try {
      const translatedText = await translateText(messageText, "vi")
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === messageId ? { ...msg, translatedText, translated: true } : msg)),
      )
    } catch (error) {
      console.error("Translation error:", error)
      Alert.alert("Lỗi", "Không thể dịch tin nhắn. Vui lòng thử lại.")
    } finally {
      setTranslatingMessageId(null)
    }
  }

  const shareRoomId = async () => {
    try {
      await Share.share({
        message: `Tham gia nhóm học tiếng Anh với ID: ${roomInfo.roomId}\n\n"${roomInfo.description}"`,
        title: "Chia sẻ nhóm học",
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const updateRoomName = () => {
    if (newRoomName.trim() === "") return
    setRoomInfo((prev) => ({ ...prev, name: newRoomName.trim() }))
    setEditingRoomName(false)
  }

  const kickMember = (member) => {
    Alert.alert("Xác nhận loại bỏ thành viên", `Bạn có chắc chắn muốn loại bỏ ${member.name} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: () => {
          Alert.alert("Thành công", `Đã loại bỏ ${member.name} khỏi nhóm.`)
        },
      },
    ])
  }

  const renderMessage = ({ item: message }) => (
    <View
      style={[
        styles.messageContainer,
        message.sender === "user" ? styles.userMessageContainer : styles.otherMessageContainer,
      ]}
    >
      {message.sender === "other" && (
        <View style={styles.messageHeader}>
          <Text style={styles.avatar}>{message.avatar}</Text>
          <Text style={styles.senderName}>{message.user}</Text>
        </View>
      )}

      <View style={[styles.messageBubble, message.sender === "user" ? styles.userMessage : styles.otherMessage]}>
        <Text
          style={[styles.messageText, message.sender === "user" ? styles.userMessageText : styles.otherMessageText]}
        >
          {message.translated ? message.translatedText : message.text}
        </Text>
        <Text style={[styles.timestamp, message.sender === "user" ? styles.userTimestamp : styles.otherTimestamp]}>
          {message.timestamp}
        </Text>
      </View>

      {message.sender === "other" && (
        <TouchableOpacity
          style={styles.translateButton}
          onPress={() => translateMessage(message.id, message.text)}
          disabled={translatingMessageId === message.id}
        >
          {translatingMessageId === message.id ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <Icon name={message.translated ? "language" : "language-outline"} size={16} color="#6B7280" />
          )}
        </TouchableOpacity>
      )}
    </View>
  )

  const renderMember = ({ item: member }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberAvatar}>{member.avatar}</Text>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.name}</Text>
          <View style={styles.memberStatus}>
            <View style={[styles.onlineIndicator, { backgroundColor: member.isOnline ? "#10B981" : "#6B7280" }]} />
            <Text style={styles.memberRole}>{member.role === "moderator" ? "Quản trị viên" : "Thành viên"}</Text>
          </View>
        </View>
      </View>

      {roomInfo.canKick && member.role !== "moderator" && (
        <TouchableOpacity style={styles.kickButton} onPress={() => kickMember(member)}>
          <Icon name="person-remove-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{roomInfo.name}</Text>
            <Text style={styles.memberCount}>
              {roomInfo.onlineMembers}/{roomInfo.members} thành viên đang hoạt động
            </Text>
          </View>

          <TouchableOpacity style={styles.headerButton} onPress={() => setShowRoomSettings(true)}>
            <Icon name="settings-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn vào nhóm..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Room Settings Modal */}
        <Modal
          visible={showRoomSettings}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRoomSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cài đặt nhóm</Text>
                <TouchableOpacity onPress={() => setShowRoomSettings(false)}>
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingsContent}>
                {/* Room Name */}
                <View style={styles.settingItem}>
                  <Icon name="chatbubbles-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Tên nhóm</Text>
                    {editingRoomName ? (
                      <View style={styles.editNameContainer}>
                        <TextInput
                          style={styles.editNameInput}
                          value={newRoomName}
                          onChangeText={setNewRoomName}
                          onSubmitEditing={updateRoomName}
                          autoFocus
                        />
                        <TouchableOpacity onPress={updateRoomName}>
                          <Icon name="checkmark" size={20} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setEditingRoomName(true)}>
                        <Text style={styles.settingValue}>{roomInfo.name}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Members */}
                <TouchableOpacity style={styles.settingItem} onPress={() => setShowMembersList(true)}>
                  <Icon name="people-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Thành viên</Text>
                    <Text style={styles.settingValue}>
                      {roomInfo.members} người ({roomInfo.onlineMembers} đang hoạt động)
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Room ID */}
                <View style={styles.settingItem}>
                  <Icon name="key-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>ID nhóm</Text>
                    <Text style={styles.settingValue}>{roomInfo.roomId}</Text>
                  </View>
                  <TouchableOpacity onPress={shareRoomId} style={styles.shareButton}>
                    <Icon name="share-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <View style={styles.settingItem}>
                  <Icon name="document-text-outline" size={20} color="#6B7280" />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Mô tả</Text>
                    <Text style={styles.settingValue}>{roomInfo.description}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={shareRoomId}>
                    <Icon name="share-outline" size={20} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Chia sẻ nhóm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="notifications-outline" size={20} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Cài đặt thông báo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
                    <Icon name="exit-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Rời khỏi nhóm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Members List Modal */}
        <Modal
          visible={showMembersList}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMembersList(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Danh sách thành viên</Text>
                <TouchableOpacity onPress={() => setShowMembersList(false)}>
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.id.toString()}
                style={styles.membersList}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  roomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  memberCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 4,
  },
  avatar: {
    fontSize: 16,
    marginRight: 6,
  },
  senderName: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userMessage: {
    backgroundColor: "#3B82F6",
  },
  otherMessage: {
    backgroundColor: "#F3F4F6",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#1F2937",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherTimestamp: {
    color: "#9CA3AF",
  },
  translateButton: {
    marginTop: 4,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    padding: 10,
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  settingsContent: {
    padding: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  settingValue: {
    fontSize: 16,
    color: "#1F2937",
    marginTop: 2,
  },
  editNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  editNameInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#3B82F6",
    paddingVertical: 2,
  },
  shareButton: {
    padding: 8,
  },
  actionButtons: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  dangerButton: {
    backgroundColor: "#FEF2F2",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    marginLeft: 8,
  },
  dangerButtonText: {
    color: "#EF4444",
  },
  membersList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    fontSize: 20,
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  memberStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  memberRole: {
    fontSize: 12,
    color: "#6B7280",
  },
  kickButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
})

export default GroupChatRoomScreen
