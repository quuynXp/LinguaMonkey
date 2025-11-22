// import { useState, useEffect, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { AppState } from 'react-native';
// import { QuizQuestion, Player, ChatMessage, User, WSMessage } from '../types/api';
// import { useUserStore } from '../stores/UserStore';
// import { WebSocketService } from '../services/WebSocketService';
// import { useGenerateSoloQuiz, useGenerateTeamQuiz } from '../hooks/useLessons'; // ✅ Dùng hook từ file lesson
// import { useTokenStore } from '../stores/tokenStore';

// const FASTAPI_WS_URL = 'wss://your-fastapi-server.com/ws/quiz'; 

// export const useLanguageQuiz = (roomId: string | null) => {
//   const { t } = useTranslation();
  
//   // Lấy thông tin user từ store
//   const { user } = useUserStore();
//   const {accessToken} = useTokenStore();

//   // State chung
//   const [questions, setQuestions] = useState<QuizQuestion[]>([]);
//   const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
//   const [showExplanation, setShowExplanation] = useState(false);
//   const [isAnswered, setIsAnswered] = useState(false);
//   const [score, setScore] = useState(0);
//   const [streak, setStreak] = useState(0);
//   const [maxStreak, setMaxStreak] = useState(0);
//   const [showResult, setShowResult] = useState(false);
  
//   // State Timer
//   const [timeLeft, setTimeLeft] = useState(30);
//   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


//   // State Solo
//   const [isPaused, setIsPaused] = useState(false);

//   // State Team
//   const wsService = useRef<WebSocketService | null>(null);
//   const [players, setPlayers] = useState<Player[]>([]);
//   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
//   const [isGameHost, setIsGameHost] = useState(false);

//   // API Hooks
//   const { 
//     data: soloQuizData, 
//     isFetching: isSoloQuizLoading, 
//     error: soloQuizError, 
//     refetch: fetchSoloQuiz 
//   } = useGenerateSoloQuiz(user?.userId);
  
//   const { 
//     mutateAsync: startTeamQuiz, 
//     isPending: isTeamQuizLoading, 
//     error: teamQuizError 
//   } = useGenerateTeamQuiz();
  
//   const isLoading = isSoloQuizLoading || isTeamQuizLoading;
//   const [error, setError] = useState<string | null>(null);


//   // --- 1. Load Solo Quiz Data ---
//   useEffect(() => {
//     // Khi hook useGenerateSoloQuiz có dữ liệu
//     if (soloQuizData && !roomId) {
//       const { questions: fetchedQuestions } = soloQuizData;
//       if (fetchedQuestions && fetchedQuestions.length > 0) {
//         setQuestions(fetchedQuestions);
//         setCurrentQuestion(fetchedQuestions[0]);
//         setCurrentQuestionIndex(0);
//         setTimeLeft(30);
//       }
//     }
//   }, [soloQuizData, roomId]);

//   // --- 2. WebSocket (Team Mode) ---
//   useEffect(() => {
//     if (!roomId || !accessToken || !user) return; // Chỉ chạy nếu là Team mode và đã auth

//     const wsUrl = `${FASTAPI_WS_URL}/${roomId}`;
//     wsService.current = new WebSocketService(wsUrl, accessToken);

//     wsService.current.onMessage(handleSocketMessage);
    
//     return () => {
//       wsService.current?.close();
//     };
//   }, [roomId, accessToken, user]);

//   // Xử lý message từ WebSocket (Team)
//   const handleSocketMessage = (msg: WSMessage) => {
//     console.log("Received WS message: ", msg.type);
//     switch (msg.type) {
//       case 'room_info': // Server trả về khi join
//         setPlayers(msg.data.players);
//         setIsGameHost(msg.data.isHost);
//         break;
//       case 'player_joined':
//         setPlayers((prev) => [...prev, msg.data.player]);
//         // (Thêm logic hiển thị thông báo "user joined" dùng thư viện toast)
//         break;
//       case 'player_left':
//         setPlayers((prev) => prev.filter(p => p.id !== msg.data.userId));
//         // (Thêm logic hiển thị thông báo "user left")
//         break;
//       case 'receive_message':
//         setChatMessages((prev) => [msg.data.chatMessage, ...prev]);
//         break;
//       case 'new_question':
//         setQuestions(prev => [...prev, msg.data.question]); // Lưu lại câu hỏi
//         setCurrentQuestion(msg.data.question);
//         setCurrentQuestionIndex(msg.data.questionIndex);
//         setIsAnswered(false);
//         setSelectedAnswer(null);
//         setShowExplanation(false);
//         setTimeLeft(30); // Đồng bộ timer
//         break;
//       case 'show_explanation':
//         setIsAnswered(true); // Khóa trả lời
//         setShowExplanation(true);
//         setTimeLeft(15); // Đồng bộ timer giải thích
//         break;
//       case 'game_over':
//         setTimeLeft(0);
//         setShowResult(true);
//         break;
//     }
//   };

//   // --- 3. Timer Logic ---
//   useEffect(() => {
//     if (timerRef.current) clearInterval(timerRef.current);
//     if (isPaused) return; // (Solo mode)

//     timerRef.current = setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           if(timerRef.current) clearInterval(timerRef.current);
//           if (!roomId) { // Chỉ Solo mode tự xử lý hết giờ
//             handleTimeUpSolo();
//           }
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => {
//         if(timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [isPaused, isAnswered, showExplanation, currentQuestionIndex, roomId, timeLeft]);

//   // --- 4. Game Logic (Solo) ---
//   const handleTimeUpSolo = () => {
//     setIsAnswered(true);
//     setStreak(0);
//     setShowExplanation(true);
//     setTimeLeft(15);
//   };

//   const handleAnswerSelectSolo = (answerIndex: number) => {
//     if (isAnswered) return;

//     setIsAnswered(true);
//     setSelectedAnswer(answerIndex);
//     const isCorrect = answerIndex === currentQuestion?.correctAnswerIndex;

//     if (isCorrect) {
//       setScore((s) => s + (currentQuestion?.points || 10));
//       const newStreak = streak + 1;
//       setStreak(newStreak);
//       setMaxStreak(Math.max(maxStreak, newStreak));
      
//       // YÊU CẦU: Bỏ qua giải thích nếu đúng
//       setShowExplanation(false);
//       setTimeout(() => {
//         handleNextQuestionSolo();
//       }, 1000);
//     } else {
//       // YÊU CẦU: Hiển thị giải thích 15s nếu sai
//       setStreak(0);
//       setShowExplanation(true);
//       setTimeLeft(15);
//     }
//   };

//   const handleNextQuestionSolo = () => {
//     if (currentQuestionIndex < questions.length - 1) {
//       const nextIndex = currentQuestionIndex + 1;
//       setCurrentQuestionIndex(nextIndex);
//       setCurrentQuestion(questions[nextIndex]);
//       setSelectedAnswer(null);
//       setShowExplanation(false);
//       setIsAnswered(false);
//       setIsPaused(false);
//       setTimeLeft(30);
//     } else {
//       setShowResult(true);
//     }
//   };

//   const togglePause = () => {
//     if (showExplanation) { // Chỉ cho phép pause khi đang giải thích
//       setIsPaused(!isPaused);
//     }
//   };

//   // --- 5. Game Logic (Team) ---
  
//   // Host gọi
//   const fetchAndStartTeamQuiz = async (topic?: string) => {
//     if (!roomId) return;
//     try {
//       const { questions: fetchedQuestions } = await startTeamQuiz({ roomId, topic });
      
//       // Gửi bộ câu hỏi cho server WS để bắt đầu game
//       wsService.current?.send({
//         type: 'start_game',
//         data: { questions: fetchedQuestions },
//       });
//     } catch (e) {
//       setError(t('quiz.error.startTeam'));
//     }
//   };

//   // Mọi người gọi
//   const handleAnswerSelectTeam = (answerIndex: number) => {
//     if (isAnswered) return;
//     setIsAnswered(true); // Khóa UI client
//     setSelectedAnswer(answerIndex);
//     wsService.current?.send({
//       type: 'submit_answer',
//       data: { answerIndex, questionId: currentQuestion?.id },
//     });
//   };
  
//   const sendChatMessage = (message: string, isIcon: boolean = false) => {
//     wsService.current?.send({
//       type: 'send_message',
//       data: { message, isIcon },
//     });
//   };

//   return {
//     // State
//     isLoading: isLoading,
//     error: error,
//     questions, currentQuestion, currentQuestionIndex,
//     selectedAnswer, showExplanation, isAnswered, score, streak, maxStreak,
//     timeLeft, isPaused, showResult,
//     // Team State
//     players, chatMessages, isGameHost,
//     // Solo Functions
//     fetchSoloQuiz, // (để gọi từ useEffect)
//     handleAnswerSelectSolo, 
//     handleNextQuestionSolo, 
//     togglePause, 
//     setShowResult,
//     // Team Functions
//     fetchAndStartTeamQuiz, 
//     sendChatMessage, 
//     handleAnswerSelectTeam
//   };
// };