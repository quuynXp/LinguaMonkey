import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
interface Message {
  id: string;
  text: string;
  originalText?: string;
  isTranslated: boolean;
  sender: 'user' | 'other';
  senderName: string;
  timestamp: Date;
  language: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  purpose: 'social' | 'learning';
  memberCount: number;
  language: string;
}

const UserChatScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi đang học tiếng Anh.',
      originalText: 'Hello! I am learning English.',
      isTranslated: true,
      sender: 'other',
      senderName: 'John',
      timestamp: new Date(Date.now() - 300000),
      language: 'en',
    },
    {
      id: '2',
      text: 'Chào bạn! Tôi cũng đang học tiếng Anh.',
      originalText: 'Chào bạn! Tôi cũng đang học tiếng Anh.',
      isTranslated: false,
      sender: 'user',
      senderName: 'Bạn',
      timestamp: new Date(Date.now() - 240000),
      language: 'vi',
    },
    {
      id: '3',
      text: 'Tuyệt vời! Chúng ta có thể luyện tập cùng nhau.',
      originalText: 'Great! We can practice together.',
      isTranslated: true,
      sender: 'other',
      senderName: 'John',
      timestamp: new Date(Date.now() - 180000),
      language: 'en',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room>({
    id: 'room123',
    name: 'Học tiếng Anh cơ bản',
    description: 'Phòng dành cho người mới bắt đầu học tiếng Anh',
    purpose: 'learning',
    memberCount: 12,
    language: 'en',
  });
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showOriginal, setShowOriginal] = useState<{[key: string]: boolean}>({});

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        originalText: inputText.trim(),
        isTranslated: false,
        sender: 'user',
        senderName: 'Bạn',
        timestamp: new Date(),
        language: 'vi',
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      
      // Simulate receiving a response
      setTimeout(() => {
        const responses = [
          'That\'s interesting! Tell me more.',
          'I agree with you.',
          'Can you help me with pronunciation?',
          'What do you think about this topic?',
          'Let\'s practice some vocabulary.',
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: autoTranslate ? translateText(randomResponse, 'en', 'vi') : randomResponse,
          originalText: randomResponse,
          isTranslated: autoTranslate,
          sender: 'other',
          senderName: 'John',
          timestamp: new Date(),
          language: 'en',
        };
        
        setMessages(prev => [...prev, responseMessage]);
      }, 1000);
    }
  };

  const translateText = (text: string, from: string, to: string): string => {
    // Simulated translation - in real app, use translation API
    const translations: {[key: string]: string} = {
      'That\'s interesting! Tell me more.': 'Thật thú vị! Kể thêm cho tôi nghe.',
      'I agree with you.': 'Tôi đồng ý với bạn.',
      'Can you help me with pronunciation?': 'Bạn có thể giúp tôi phát âm không?',
      'What do you think about this topic?': 'Bạn nghĩ gì về chủ đề này?',
      'Let\'s practice some vocabulary.': 'Hãy luyện tập từ vựng nào.',
      'Hello! I am learning English.': 'Xin chào! Tôi đang học tiếng Anh.',
      'Great! We can practice together.': 'Tuyệt vời! Chúng ta có thể luyện tập cùng nhau.',
    };
    
    return translations[text] || text;
  };

  const toggleOriginalText = (messageId: string) => {
    setShowOriginal(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const leaveRoom = () => {
    Alert.alert(
      'Rời khỏi phòng',
      'Bạn có chắc chắn muốn rời khỏi phòng chat này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Rời khỏi', 
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    const shouldShowOriginal = showOriginal[item.id];
    const displayText = shouldShowOriginal ? item.originalText : item.text;

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.otherBubble]}>
          <Text style={styles.senderName}>{item.senderName}</Text>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.otherMessageText]}>
            {displayText}
          </Text>
          
          {item.isTranslated && (
            <TouchableOpacity
              style={styles.translateButton}
              onPress={() => toggleOriginalText(item.id)}
            >
              <Icon 
                name={shouldShowOriginal ? 'translate' : 'translate-off'} 
                size={14} 
                color={isUser ? '#FFFFFF' : '#4F46E5'} 
              />
              <Text style={[styles.translateButtonText, isUser && styles.userTranslateButtonText]}>
                {shouldShowOriginal ? 'Dịch' : 'Gốc'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.otherTimestamp]}>
            {item.timestamp.toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{currentRoom.name}</Text>
          <Text style={styles.memberCount}>{currentRoom.memberCount} thành viên</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('ChatSettings')}
          >
            <Icon name="settings" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={leaveRoom}
          >
            <Icon name="exit-to-app" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Room Description */}
      <View style={styles.roomDescription}>
        <Icon name="info" size={16} color="#6B7280" />
        <Text style={styles.roomDescriptionText}>{currentRoom.description}</Text>
        <View style={[styles.purposeBadge, currentRoom.purpose === 'learning' ? styles.learningBadge : styles.socialBadge]}>
          <Text style={[styles.purposeText, currentRoom.purpose === 'learning' ? styles.learningText : styles.socialText]}>
            {currentRoom.purpose === 'learning' ? 'Học tập' : 'Giao lưu'}
          </Text>
        </View>
      </View>

      {/* Translation Status */}
      {autoTranslate && (
        <View style={styles.translationStatus}>
          <Icon name="translate" size={16} color="#10B981" />
          <Text style={styles.translationStatusText}>Dịch tự động đang bật</Text>
        </View>
      )}

      {/* Messages */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          contentContainerStyle={styles.messagesList}
        />
      </Animated.View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Icon name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  roomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  memberCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  roomDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  roomDescriptionText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  learningBadge: {
    backgroundColor: '#ECFDF5',
  },
  socialBadge: {
    backgroundColor: '#EEF2FF',
  },
  purposeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  learningText: {
    color: '#10B981',
  },
  socialText: {
    color: '#4F46E5',
  },
  translationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  translationStatusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  translateButtonText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  userTranslateButtonText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
  },
  userTimestamp: {
    color: '#C7D2FE',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default UserChatScreen;