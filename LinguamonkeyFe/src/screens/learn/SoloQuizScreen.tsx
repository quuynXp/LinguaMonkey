// import React, { useEffect, useRef } from "react";
// import { Animated, Modal, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { QuizQuestion, QuizResult } from "../../types/api";
// ;
// import { useUserStore } from "../../stores/UserStore";
// import { useLanguageQuiz } from "../../hooks/useLanguageQuiz"; // ✅ Import hook
// import { useTranslation } from "react-i18next";
// import { SafeAreaView } from "react-native-safe-area-context";

// const SoloQuizScreen = ({ navigation, route }) => {
//   const { t } = useTranslation();
//   const userId = useUserStore((s) => s.user?.userId);

//   const {
//     isLoading,
//     error,
//     questions,
//     currentQuestion,
//     currentQuestionIndex,
//     selectedAnswer,
//     showExplanation,
//     isAnswered,
//     score,
//     streak,
//     maxStreak,
//     timeLeft,
//     isPaused,
//     showResult,
//     fetchSoloQuiz,
//     handleAnswerSelectSolo,
//     handleNextQuestionSolo,
//     togglePause,
//     setShowResult
//   } = useLanguageQuiz(null); // null roomId = Solo Mode

//   // Load câu hỏi khi vào màn hình
//   useEffect(() => {
//     if (userId) {
//       // refetch() là tên hàm trả về từ useQuery
//       fetchSoloQuiz(); 
//     }
//   }, [userId, fetchSoloQuiz]);
  
//   // State/Refs cho animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const scaleAnim = useRef(new Animated.Value(1)).current;
//   const progressAnim = useRef(new Animated.Value(0)).current;

//   // Animate khi câu hỏi thay đổi
//   useEffect(() => {
//     if (questions.length > 0) {
//         fadeAnim.setValue(0);
//         Animated.timing(fadeAnim, {
//             toValue: 1,
//             duration: 600,
//             useNativeDriver: true,
//         }).start();

//         Animated.timing(progressAnim, {
//             toValue: (currentQuestionIndex + 1) / questions.length,
//             duration: 300,
//             useNativeDriver: false,
//         }).start();
//     }
//   }, [currentQuestionIndex, questions.length, fadeAnim, progressAnim]);

  
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

//   const getDifficultyColor = (difficulty: string = "easy") => {
//     switch (difficulty) {
//       case "medium": return "#F59E0B";
//       case "hard": return "#EF4444";
//       case "easy":
//       default: return "#10B981";
//     }
//   };

//   // --- Render Functions ---

//   const renderResultModal = () => {
//     const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
//     const correctAnswers = questions.filter((q, idx) => {
//         // Cần một logic phức tạp hơn để lưu lại câu trả lời đúng
//         // Tạm tính dựa trên điểm
//         return score > 0; // (Logic này cần được cải thiện)
//     }).length; 

//     const result: QuizResult = {
//         score: score,
//         totalQuestions: questions.length,
//         correctAnswers: correctAnswers, // (Cần logic tốt hơn)
//         timeSpent: 0, // (Cần tính toán tổng thời gian)
//         experienceGained: Math.round(score * 1.5),
//         skillsImproved: [...new Set(questions.map((q) => q.type))].filter(Boolean) as string[],
//     };
//     const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100) || 0;

//     return (
//       <Modal visible={showResult} animationType="slide">
//         <SafeAreaView style={styles.resultContainer}>
//           <View style={styles.resultHeader}>
//             <Text style={styles.resultTitle}>{t('quiz.results.title')}</Text>
//             <TouchableOpacity onPress={() => navigation.goBack()}>
//               <Icon name="close" size={24} color="#374151" />
//             </TouchableOpacity>
//           </View>

//           <ScrollView style={styles.resultContent}>
//             <View style={styles.scoreCard}>
//               <Text style={styles.scorePercentage}>{percentage}%</Text>
//               <Text style={styles.scoreDescription}>
//                 {t('quiz.results.correct', { correct: result.correctAnswers, total: result.totalQuestions })}
//               </Text>
//             </View>
            
//             <View style={styles.statsGrid}>
//                 <View style={styles.statItem}>
//                     <Icon name="stars" size={24} color="#F59E0B" />
//                     <Text style={styles.statValue}>{result.score}</Text>
//                     <Text style={styles.statLabel}>{t('quiz.results.points')}</Text>
//                 </View>
//                 <View style={styles.statItem}>
//                     <Icon name="trending-up" size={24} color="#10B981" />
//                     <Text style={styles.statValue}>+{result.experienceGained}</Text>
//                     <Text style={styles.statLabel}>{t('quiz.results.xp')}</Text>
//                 </View>
//                 <View style={styles.statItem}>
//                     <Icon name="local-fire-department" size={24} color="#EF4444" />
//                     <Text style={styles.statValue}>{maxStreak}</Text>
//                     <Text style={styles.statLabel}>{t('quiz.results.bestStreak')}</Text>
//                 </View>
//                  <View style={styles.statItem}>
//                     <Icon name="schedule" size={24} color="#3B82F6" />
//                     <Text style={styles.statValue}>~{Math.round(questions.length * 30 / 60)}m</Text>
//                     <Text style={styles.statLabel}>{t('quiz.results.time')}</Text>
//                 </View>
//             </View>
            
//              <View style={styles.skillsSection}>
//               <Text style={styles.skillsTitle}>{t('quiz.results.skills')}</Text>
//               <View style={styles.skillsList}>
//                 {result.skillsImproved.map((skill, index) => (
//                   <View key={index} style={styles.skillTag}>
//                     <Text style={styles.skillTagText}>{skill}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={styles.resultActions}>
//                 <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
//                     <Icon name="home" size={20} color="#6B7280" />
//                     <Text style={styles.actionButtonText}>{t('quiz.results.home')}</Text>
//                 </TouchableOpacity>
//                  <TouchableOpacity style={styles.actionButton} onPress={() => {
//                      setShowResult(false);
//                      fetchSoloQuiz();
//                  }}>
//                     <Icon name="refresh" size={20} color="#4F46E5" />
//                     <Text style={styles.actionButtonText}>{t('quiz.results.retry')}</Text>
//                 </TouchableOpacity>
//             </View>
//           </ScrollView>
//         </SafeAreaView>
//       </Modal>
//     );
//   };

//   if (isLoading && !currentQuestion) {
//     return (
//       <SafeAreaView style={[styles.container, styles.center]}>
//         <ActivityIndicator size="large" color="#4F46E5" />
//         <Text style={styles.loadingText}>{t('quiz.loading')}</Text>
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={[styles.container, styles.center]}>
//         <Icon name="error-outline" size={48} color="#EF4444" />
//         <Text style={styles.errorText}>{error}</Text>
//         <TouchableOpacity style={styles.nextButton} onPress={() => fetchSoloQuiz()}>
//             <Text style={styles.nextButtonText}>{t('quiz.results.retry')}</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   if (!currentQuestion) {
//     return <SafeAreaView style={styles.container} />; // Trống
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Icon name="close" size={24} color="#374151" />
//         </TouchableOpacity>
//         <View style={styles.headerInfo}>
//           <Text style={styles.questionCounter}>
//             {t('quiz.questionCounter', { current: currentQuestionIndex + 1, total: questions.length })}
//           </Text>
//           <Text style={styles.currentScore}>{t('quiz.points', { count: score })}</Text>
//         </View>
//         <View style={styles.streakContainer}>
//           <Icon name="local-fire-department" size={20} color="#EF4444" />
//           <Text style={styles.streakText}>{streak}</Text>
//         </View>
//       </View>

//       <View style={styles.progressContainer}>
//         <Animated.View
//           style={[ styles.progressBar, {
//               width: progressAnim.interpolate({
//                 inputRange: [0, 1],
//                 outputRange: ["0%", "100%"],
//               }),
//             }]}
//         />
//       </View>

//       <ScrollView>
//         <View style={styles.timerContainer}>
//           <View style={[styles.timerCircle, { borderColor: timeLeft <= 10 ? "#EF4444" : "#4F46E5" }]}>
//             <Text style={[styles.timerText, { color: timeLeft <= 10 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}</Text>
//           </View>
//         </View>

//         <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
//           <View style={styles.questionCard}>
//             <View style={styles.questionHeader}>
//               <View style={[ styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(currentQuestion.difficulty)}20` }]}>
//                 <Text style={[styles.difficultyText, { color: getDifficultyColor(currentQuestion.difficulty) }]}>
//                   {currentQuestion.difficulty.toUpperCase()}
//                 </Text>
//               </View>
//               <View style={styles.skillBadge}>
//                 <Text style={styles.skillBadgeText}>{currentQuestion.type}</Text>
//               </View>
//             </View>

//             <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

//             <View style={styles.optionsContainer}>
//               {currentQuestion.options.map((option, index) => (
//                 <TouchableOpacity
//                   key={index}
//                   style={getOptionStyle(index)}
//                   onPress={() => handleAnswerSelectSolo(index)}
//                   disabled={isAnswered}
//                 >
//                   <View style={styles.optionContent}>
//                     <View style={styles.optionIndicator}>
//                       <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
//                     </View>
//                     <Text style={getOptionTextStyle(index)}>{option}</Text>
//                     {isAnswered && index === currentQuestion.correctAnswerIndex && (
//                       <Icon name="check-circle" size={20} color="#10B981" />
//                     )}
//                     {isAnswered && index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswerIndex && (
//                       <Icon name="cancel" size={20} color="#EF4444" />
//                     )}
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {showExplanation && (
//             <Animated.View style={styles.explanationCard}>
//               <View style={styles.explanationHeader}>
//                 <Icon
//                   name={selectedAnswer === currentQuestion.correctAnswerIndex ? "check-circle" : "info"}
//                   size={20}
//                   color={selectedAnswer === currentQuestion.correctAnswerIndex ? "#10B981" : "#3B82F6"}
//                 />
//                 <Text style={styles.explanationTitle}>
//                   {selectedAnswer === currentQuestion.correctAnswerIndex ? t('quiz.correct') : t('quiz.explanation')}
//                 </Text>
//               </View>
//               <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>

//               {/* ✅ Nút Pause/Resume */}
//               <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
//                 <Icon name={isPaused ? "play-arrow" : "pause"} size={20} color="#FFFFFF" />
//                 <Text style={styles.nextButtonText}>{isPaused ? t('quiz.resume') : t('quiz.pause')}</Text>
//               </TouchableOpacity>

//               <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestionSolo}>
//                 <Text style={styles.nextButtonText}>
//                   {currentQuestionIndex < questions.length - 1 ? t('quiz.nextQuestion') : t('quiz.finishQuiz')}
//                 </Text>
//                 <Icon name="arrow-forward" size={20} color="#FFFFFF" />
//               </TouchableOpacity>
//             </Animated.View>
//           )}
//         </Animated.View>
//       </ScrollView>

//       {renderResultModal()}
//     </SafeAreaView>
//   );
// };

// const styles = createScaledSheet({
//   container: { flex: 1, backgroundColor: "#F8FAFC" },
//   center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#4F46E5' },
//   errorText: { marginTop: 10, fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 20 },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
//   headerInfo: { alignItems: "center" },
//   questionCounter: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
//   currentScore: { fontSize: 12, color: "#6B7280" },
//   streakContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
//   streakText: { fontSize: 16, fontWeight: "bold", color: "#EF4444" },
//   progressContainer: { height: 4, backgroundColor: "#E5E7EB", marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
//   progressBar: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 2 },
//   timerContainer: { alignItems: "center", paddingVertical: 20 },
//   timerCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
//   timerText: { fontSize: 20, fontWeight: "bold" },
//   content: { paddingHorizontal: 20 },
//   questionCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
//   questionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
//   difficultyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
//   difficultyText: { fontSize: 10, fontWeight: "bold" },
//   skillBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
//   skillBadgeText: { fontSize: 10, color: "#4F46E5", fontWeight: "600" },
//   questionText: { fontSize: 18, color: "#1F2937", fontWeight: "600", lineHeight: 26, marginBottom: 24 },
//   optionsContainer: { gap: 12 },
//   option: { borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, backgroundColor: "#FFFFFF" },
//   selectedOption: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
//   correctOption: { borderColor: "#10B981", backgroundColor: "#ECFDF5" },
//   incorrectOption: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
//   optionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
//   optionIndicator: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
//   optionLetter: { fontSize: 12, fontWeight: "bold", color: "#6B7280" },
//   optionText: { flex: 1, fontSize: 16, color: "#374151" },
//   selectedOptionText: { color: "#4F46E5", fontWeight: "500" },
//   correctOptionText: { color: "#059669", fontWeight: "500" },
//   incorrectOptionText: { color: "#DC2626", fontWeight: "500" },
//   explanationCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
//   explanationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
//   explanationTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
//   explanationText: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 20 },
//   nextButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", paddingVertical: 12, borderRadius: 8, gap: 8, marginTop: 10 },
//   nextButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
//   pauseButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F59E0B", paddingVertical: 12, borderRadius: 8, gap: 8 },
//   resultContainer: { flex: 1, backgroundColor: "#F8FAFC" },
//   resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
//   resultTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
//   resultContent: { flex: 1, padding: 20 },
//   scoreCard: { alignItems: "center", marginBottom: 32, backgroundColor: '#FFF', padding: 20, borderRadius: 16 },
//   scorePercentage: { fontSize: 48, fontWeight: "bold", color: "#4F46E5", marginBottom: 8 },
//   scoreDescription: { fontSize: 16, color: "#6B7280" },
//   statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: 'space-between', gap: 16, marginBottom: 32 },
//   statItem: { alignItems: "center", width: "48%", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, gap: 4 },
//   statValue: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
//   statLabel: { fontSize: 12, color: "#6B7280" },
//   skillsSection: { width: "100%", marginBottom: 32 },
//   skillsTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12, textAlign: "center" },
//   skillsList: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
//   skillTag: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
//   skillTagText: { fontSize: 12, color: "#4F46E5", fontWeight: "500" },
//   resultActions: { flexDirection: "row", gap: 16, justifyContent: 'center' },
//   actionButton: { alignItems: "center", gap: 4, padding: 10 },
//   actionButtonText: { fontSize: 12, color: "#6B7280" },
// });

// export default SoloQuizScreen;