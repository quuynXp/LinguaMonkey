// import React, { useEffect, useState } from 'react';
// import { 
//   View, 
//   Text, 
//   FlatList, 
//   TextInput, 
//   TouchableOpacity, 
//   Image, 
//   KeyboardAvoidingView, 
//   Platform, 
//   ScrollView,
//   ActivityIndicator,
//   Alert
// , StyleSheet } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useLanguageQuiz } from '../../hooks/useLanguageQuiz';
// import { createScaledSheet } from '../../utils/scaledStyles';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useTranslation } from 'react-i18next';
// import { useUserStore } from '../../stores/UserStore';

// const TeamQuizRoom = ({ route, navigation }) => {
//   const { t } = useTranslation();
//   const { roomId } = route.params; // Lấy roomId từ navigation
//   const currentUserId = useUserStore((s) => s.user?.userId);

//   const {
//     isLoading, // Dùng để load câu hỏi (cho host)
//     error,
//     currentQuestion,
//     players,
//     chatMessages,
//     timeLeft,
//     isGameHost,
//     isAnswered,
//     selectedAnswer,
//     showExplanation,
//     fetchAndStartTeamQuiz,
//     sendChatMessage,
//     handleAnswerSelectTeam,
//   } = useLanguageQuiz(roomId); // ✅ Kích hoạt Team Mode
  
//   const [chatInput, setChatInput] = useState('');
//   const [activeTab, setActiveTab] = useState<'CHAT' | 'PLAYERS'>('CHAT');

//   const handleSendChat = () => {
//     if (chatInput.trim()) {
//       sendChatMessage(chatInput, false);
//       setChatInput('');
//     }
//   };
  
//   const handleStartGame = () => {
//      fetchAndStartTeamQuiz(); // (Có thể thêm topic)
//   }
  
//   // Thông báo lỗi
//   useEffect(() => {
//     if (error) {
//       Alert.alert("Error", error);
//     }
//   }, [error]);

//   // --- Helper Functions cho Styles ---
//   const getOptionStyle = (index: number) => {
//     if (!isAnswered) {
//       return selectedAnswer === index ? styles.selectedOption : styles.option;
//     }
//     if (index === currentQuestion?.correctAnswerIndex) {
//       return styles.correctOption;
//     }
//     if (index === selectedAnswer && selectedAnswer !== currentQuestion?.correctAnswerIndex) {
//       return styles.incorrectOption;
//     }
//     return styles.option;
//   };
  
//   const getOptionTextStyle = (index: number) => {
//     let baseStyle = styles.optionText;
//     if (!isAnswered) {
//       return selectedAnswer === index ? [baseStyle, styles.selectedOptionText] : baseStyle;
//     }
//     if (index === currentQuestion?.correctAnswerIndex) {
//       return [baseStyle, styles.correctOptionText];
//     }
//     if (index === selectedAnswer && selectedAnswer !== currentQuestion?.correctAnswerIndex) {
//       return [baseStyle, styles.incorrectOptionText];
//     }
//     return baseStyle;
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView 
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
//       >
//         {/* 1. Header (Timer + Câu hỏi) */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
//             <Icon name="close" size={24} color="#374151" />
//           </TouchableOpacity>
//           <Text style={styles.timer}>{timeLeft}s</Text>
          
//           {!currentQuestion && isGameHost && !isLoading && (
//               <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
//                   <Text style={styles.startButtonText}>{t('quiz.team.startGame')}</Text>
//               </TouchableOpacity>
//           )}
//           {!currentQuestion && isGameHost && isLoading && (
//               <ActivityIndicator size="small" color="#4F46E5" />
//           )}
//           {!currentQuestion && !isGameHost && (
//               <Text style={styles.questionText}>{t('quiz.team.waitingForHost')}</Text>
//           )}
          
//           {currentQuestion && !showExplanation && (
//               <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
//           )}
//           {currentQuestion && showExplanation && (
//               <View>
//                 <Text style={styles.explanationTitle}>{t('quiz.explanation')}</Text>
//                 <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
//               </View>
//           )}
//         </View>

//         {/* 2. Phần chính (Câu trả lời) */}
//         <ScrollView style={styles.mainContent}>
//           {currentQuestion?.options.map((option, index) => (
//               <TouchableOpacity 
//                   key={index} 
//                   style={getOptionStyle(index)} // ✅ Dùng style
//                   onPress={() => handleAnswerSelectTeam(index)}
//                   disabled={isAnswered} // ✅ Disable khi đã trả lời
//               >
//                   <Text style={getOptionTextStyle(index)}>{String.fromCharCode(65 + index)}. {option}</Text>
//                    {isAnswered && index === currentQuestion.correctAnswerIndex && (
//                       <Icon name="check-circle" size={20} color="#10B981" style={styles.optionIcon} />
//                     )}
//                     {isAnswered && index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswerIndex && (
//                       <Icon name="cancel" size={20} color="#EF4444" style={styles.optionIcon} />
//                     )}
//               </TouchableOpacity>
//           ))}
//         </ScrollView>

//         {/* 3. Khu vực Chat / Players */}
//         <View style={styles.bottomContainer}>
//           <View style={styles.tabContainer}>
//             <TouchableOpacity onPress={() => setActiveTab('CHAT')} style={[styles.tab, activeTab === 'CHAT' && styles.activeTab]}>
//               <Text style={styles.tabText}>{t('quiz.team.chat')}</Text>
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => setActiveTab('PLAYERS')} style={[styles.tab, activeTab === 'PLAYERS' && styles.activeTab]}>
//               <Text style={styles.tabText}>{t('quiz.team.players', { count: players.length })}</Text>
//             </TouchableOpacity>
//           </View>

//           {activeTab === 'CHAT' ? (
//             <View style={styles.chatSection}>
//               <FlatList
//                 data={chatMessages}
//                 inverted
//                 keyExtractor={(item) => item.chatMessageId || item.sentAt.toString()}
//                 renderItem={({ item }) => (
//                   <View style={styles.chatMessage}>
//                     <Text style={[styles.chatUser, item.senderId === currentUserId && styles.chatUserMe]}>
//                       {item.senderId === currentUserId ? t('quiz.team.you') : (useUserStore().user.nickname || useUserStore().user.fullname) }:
//                     </Text>
//                     <Text style={styles.chatText}>{item.content}</Text>
//                   </View>
//                 )}
//               />
//               <View style={styles.chatInputContainer}>
//                 <TextInput
//                   style={styles.chatInput}
//                   value={chatInput}
//                   onChangeText={setChatInput}
//                   placeholder={t('quiz.team.chatPlaceholder')}
//                   placeholderTextColor="#9CA3AF"
//                 />
//                 <TouchableOpacity onPress={handleSendChat} style={styles.sendButton}>
//                   <Icon name="send" size={20} color="#FFFFFF" />
//                 </TouchableOpacity>
//               </View>
//             </View>
//           ) : (
//             <FlatList
//               data={players}
//               keyExtractor={(item) => item.id}
//               numColumns={5}
//               renderItem={({ item }) => (
//                 <View style={styles.playerAvatar}>
//                   <Image source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />
//                   <Text style={styles.playerName} numberOfLines={1}>{item.name}</Text>
//                 </View>
//               )}
//               style={styles.playerList}
//               contentContainerStyle={styles.playerListContent}
//             />
//           )}
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// const styles = createScaledSheet({
//   container: { flex: 1, backgroundColor: '#F8FAFC' },
//   header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', minHeight: 150, justifyContent: 'center' },
//   closeButton: { position: 'absolute', top: 10, left: 15, zIndex: 10, padding: 5 },
//   timer: { fontSize: 22, fontWeight: 'bold', color: '#EF4444', textAlign: 'center', marginBottom: 10 },
//   questionText: { fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
//   explanationTitle: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center' },
//   explanationText: { fontSize: 14, color: '#374151', textAlign: 'center', marginTop: 5 },
//   startButton: { backgroundColor: '#10B981', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'center' },
//   startButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
//   mainContent: { flex: 1, padding: 20 },
//   option: { borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, backgroundColor: "#FFFFFF", marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   selectedOption: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
//   correctOption: { borderColor: "#10B981", backgroundColor: "#ECFDF5" },
//   incorrectOption: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
//   optionText: { fontSize: 16, color: "#374151", flex: 1 },
//   selectedOptionText: { color: "#4F46E5", fontWeight: "500" },
//   correctOptionText: { color: "#059669", fontWeight: "500" },
//   incorrectOptionText: { color: "#DC2626", fontWeight: "500" },
//   optionIcon: { marginLeft: 10 },
//   bottomContainer: { height: 280, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFF' },
//   tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
//   tab: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#F9F9F9' },
//   activeTab: { backgroundColor: '#FFF', borderBottomWidth: 2, borderBottomColor: '#4F46E5' },
//   tabText: { fontSize: 14, fontWeight: '500', color: '#374151' },
//   chatSection: { flex: 1, padding: 10, justifyContent: 'flex-end' },
//   chatMessage: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 5, flexWrap: 'wrap' },
//   chatUser: { fontWeight: 'bold', marginRight: 5, color: '#3B82F6' },
//   chatUserMe: { color: '#10B981' },
//   chatText: { fontSize: 14, color: '#1F2937' },
//   chatInputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, paddingHorizontal: 5 },
//   chatInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#DDD', borderRadius: 20, paddingHorizontal: 15, marginRight: 10, backgroundColor: '#F8FAFC', color: '#1F2937' },
//   sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
//   playerList: { flex: 1 },
//   playerListContent: { padding: 10 },
//   playerAvatar: { alignItems: 'center', width: '20%', marginBottom: 15, paddingHorizontal: 4 },
//   avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E0E0' },
//   playerName: { fontSize: 12, marginTop: 4, textAlign: 'center', color: '#374151' },
// });

// export default TeamQuizRoom;