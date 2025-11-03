export interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

export interface QuizApiResponse {
  quizId: string;
  questions: QuizQuestion[];
}

export interface StudySession {
  id: string;         // activity_id
  type: string;       // e.g., "LESSON_COMPLETED", "DAILY_CHALLENGE_COMPLETED"
  title: string;
  date: string;       // Backend trả về Instant (ISO String)
  duration: number;   // duration_in_seconds
  score?: number;
  maxScore?: number;
  experience: number;
  skills: string[];   // Backend trả về List<String>
  completed: boolean;
}

/**
 * Khớp với StatsResponse.java từ backend
 * Đây là các chỉ số thống kê
 */
export interface StudyStats {
  totalSessions: number;
  totalTime: number; // in seconds
  totalExperience: number;
  averageScore: number; // percentage
}

/**
 * Khớp với TestResult (tạm thời, bạn có thể mở rộng sau)
 */
export interface TestResult {
  id: string;
  testType: "toeic" | "ielts";
  date: string; // ISO String
  overallScore: number;
  sections: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  targetScore: number;
  improvement: number;
}

/**
 * Khớp với StudyHistoryResponse.java từ backend
 * Đây là đối tượng gốc mà endpoint /history trả về
 */
export interface StudyHistoryResponse {
  sessions: StudySession[];
  tests: TestResult[];
  stats: StudyStats;
}

export type BadgeProgressResponse = {
  badgeId: string;
  badgeName: string;
  description: string;
  imageUrl: string;

  criteriaType: string;
  criteriaThreshold: number;

  currentUserProgress: number;
  isAchieved: boolean;
};

export interface RoomResponse {
  roomId: string;
  roomName: string;
}

export interface UserResponse {
  userId: string;
  email: string;
  fullname: string;
  nickname: string;
  bio: string;
  phone: string;
  avatarUrl: string;
  character3dId: string | null;
  badgeId: string | null;
  nativeLanguageId: string | null;
  authProvider: string;
  country: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  progress: number;
  streak: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}


export type WSMessage =
  | { type: 'room_info'; data: { players: Player[]; isHost: boolean } }
  | { type: 'player_joined'; data: { player: Player } }
  | { type: 'player_left'; data: { userId: number } }
  | { type: 'receive_message'; data: { chatMessage: ChatMessage } }
  | { type: 'new_question'; data: { question: QuizQuestion; questionIndex: number } }
  | { type: 'show_explanation'; data: null }
  | { type: 'game_over'; data: null }
  | { type: string; data?: any };


// Type cho người chơi trong phòng (Team)
export interface Player {
  id: string;
  name: string;
  avatar: string;
  // (thêm các trường khác nếu cần, vd: score)
}

export enum MediaType {
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  DOCUMENT = "DOCUMENT",
  OTHER = "OTHER",
}

// (Các type này nên được định nghĩa ở file /types chung)
export interface Player {
  id: string;
  name: string;
  avatar: string;
}

export interface Wallet { walletId: string; userId: string; balance: number }

export interface UserMedia {
  id: number;
  userId: string;
  mediaType: MediaType;
  fileName: string;
  filePath: string;
  fileUrl: string;
  createdAt?: string;
}

export interface BadgeResponse {
  badgeId: string;
  badgeName: string;
  description: string;
  imageUrl: string;
  createdAt?: string; // ISO date string
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface MindMapNode {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  type?: string;
  color: string;
  level: number;
  children: string[];
  examples: string[];
  rules: string[];
}

export interface IPASound {
  symbol: string;
  example: string;
  audioUrl: string;
  type: "vowel" | "consonant";
  description: string;
}

export interface ConversationTopic {
  id: string;
  title: string;
  description: string;
  level: "basic" | "intermediate" | "advanced";
  icon: string;
  color: string;
  scenarios: string[];
}

export interface AIResponse {
  text: string;
  audioUrl: string;
  feedback?: {
    pronunciation: number;
    fluency: number;
    grammar: number;
    suggestions: string[];
  };
}

export interface Flashcard {
  id: string;
  lessonId?: string;
  word: string;
  definition: string;
  example?: string;
  image?: string;
  isPublic?: boolean;
  likes?: number;
  isFavorite?: boolean;
  isLiked?: boolean;
  author?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  category?: string;
  nextReviewAt?: string;
}

export interface ReadingText {
  id: string;
  title: string;
  content: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  sentences: string[];
  vocabulary: string[];
}

export interface Translation {
  original: string;
  translated: string;
  isCorrect: boolean;
  suggestion?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string,
  // unified shape covering both variants seen in original file
  question?: string; // used when question text present
  riddle?: string; // some usages used 'riddle'
  category?: string;
  options?: string[];
  correctAnswer?: number;
  correctAnswerIndex?: number; // alias if some code expects different key
  explanation?: string;
  type?: "vocabulary" | "grammar" | "comprehension";
  difficulty?: "easy" | "medium" | "hard";
  skill?: string;
  points?: number;
}

export interface Sentence {
  id: string;
  text: string;
  phonetic: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  audioUrl: string;
}

export interface WordScore {
  word: string;
  score?: number;
  isCorrect: boolean;
  suggestion?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  icon: string;
  color: string;
  contentCount: number;
}

export interface Content {
  id: string;
  title: string;
  type: "video" | "audio";
  duration: number;
  level: string;
  transcript: string;
  url: string;
  thumbnail?: string;
}

export interface PronunciationResult {
  overallScore?: number;
  wordScores?: WordScore[];
  transcript?: string;
  suggestions?: string[];
}

export interface QuizResult {
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  timeSpent?: number;
  experienceGained?: number;
  skillsImproved?: string[];
}

export const languageToCountry: Record<string, string> = {
  vi: "VN",
  en: "US",
  ja: "JP",
  fr: "FR",
  ko: "KR",
  zh: "CN",
  es: "ES",
  de: "DE",
  it: "IT",
  ru: "RU",
  pt: "PT",
};

export type Country =
  | "CHINA"
  | "TONGA"
  | "VIETNAM"
  | "KOREA"
  | "JAPAN"
  | "UNITED_STATES"
  | "FRANCE"
  | "GERMANY"
  | "ITALY"
  | "SPAIN"
  | "SOUTH_KOREA"
  | "INDIA";

export type LearningPace = "SLOW" | "MAINTAIN" | "FAST" | "ACCELERATED";

export interface CreateUserPayload {
  username?: string;
  email?: string | null;
  password?: string;
  fullname?: string | null;
  nickname?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  character3dId?: string | null;
  badgeId?: string | null;
  ageRange?: string | null;
  learningPace?: LearningPace;
  interestestIds?: string[];
  goalIds?: string[]; // ["CONVERSATION","BUSINESS"]
  certificationIds?: string[]; // e.g. ["TOEFL","IELTS"]
  nativeLanguageCode?: string | null; // "EN","VI",...
  country?: Country;
  level?: number;
  score?: number;
  streak?: number;
  languages?: string[];
}

export interface RegisterResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/* Generic responses / DTOs */
export interface LessonCategoryResponse {
  lessonCategoryId: string;
  lessonCategoryName?: string;
}
export interface LessonResponse {
  lessonId: string;
  lessonName?: string;
}
export interface LessonQuestionResponse {
  lessonQuestionId: string;
  lessonId: string;
  question: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
}

export interface LessonProgressWrongItemRequest {
  lessonId: string;
  userId: string;
  lessonQuestionId: string;
  wrongAnswer?: string;
  isDeleted?: boolean;
}

export interface UIQuestion {
  id: string;
  lessonId: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export enum AgeRange {
  AGE_18_24 = "18_24",
  AGE_25_34 = "25_34",
  AGE_35_44 = "35_44",
  AGE_45_PLUS = "45_PLUS",
}

/* --- Entities (camelCase) --- */
export interface Interest {
  interestId: string;
  interestName: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserInterest {
  userId: string;
  interestId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface BVRaw {
  videoId: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  languageCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isLiked: boolean;
  duration: string;
  progress: number;
}

export interface SubtitleRaw {
  subtitleId: string;
  videoId: string;
  languageCode: string;
  subtitleUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtitle extends SubtitleRaw {
  startTime: number;
  endTime: number;
  originalText?: string;
  translatedText?: string;
}

export interface VocabularyItem {
  word: string;
  pronunciation?: string;
  meaning?: string;
  timestamp: number;
}

export interface BilingualVideo extends BVRaw {
  subtitles: Subtitle[];
  vocabulary?: VocabularyItem[];
  level?: string;
  category?: string;
  likesCount?: number;
  dislikesCount?: number;
  isFavorited?: boolean;
  isDisliked: boolean;
}

export interface Note {
  noteId: string;
  userId: string;
  targetId?: string | null;
  targetType?: string | null;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrammarTopic {
  topicId: string;
  topicName: string;
  languageCode?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rules?: GrammarRule[];
}

export interface GrammarRule {
  ruleId: string;
  topicId: string;
  title: string;
  explanation?: string | null;
  examples?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  exercises?: GrammarExercise[];
  userScore?: number | null;
}

export interface GrammarExercise {
  exerciseId: string;
  ruleId: string;
  type: "fill-blank" | "multiple-choice" | "transformation" | string;
  question?: string | null;
  options?: string[] | null;
  correct?: string | null;
  explanation?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitExerciseResponse {
  score?: number;
  total: number;
  correct: number;
  details: Record<string, boolean> | Record<string, boolean>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* --- User related types --- */
export interface User {
  userId: string;
  email?: string | null;
  password?: string | null;
  fullname?: string | null;
  nickname?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  character3dId?: string | null;
  nativeLanguageCode?: string | null;
  authProvider?: string | null;
  country?: string | null;
  level?: number;
  exp?: number;
  streak?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  learningPace?: string | null;
  ageRange?: string | null;
  proficiency?: string | null;
}

export interface UserProfile {
  userId: string;
  email: string;
  fullname: string;
  nickname: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
  character3dId?: string;
  badgeId?: string;
  nativeLanguageId?: string;
  nativeLanguageCode?: string;
  authProvider: string;
  country: string;
  ageRange?: string;
  proficiency?: string;
  level?: number;
  exp?: number;
  expToNextLevel?: number;
  progress?: number;
  streak: number;
  languages: string[];
  certificationIds: string[];
  interestestIds: string[];
  goalIds: string[];
  learningPace: string;
  hasDonePlacementTest: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserStats {
  totalStudyTime: number;
  lessonsCompleted: number;
  wordsLearned: number;
  testsCompleted: number;
  averageScore: number;
}

export interface UserBadge {
  badgeId: string;
  userId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Badge {
  badgeId: string;
  badgeName: string;
  description?: string | null;
  imageUrl?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserLanguage {
  languageCode: string;
  userId: string;
  proficiencyLevel?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Language {
  languageCode: string;
  languageName: string;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Learning content types --- */
export interface Lesson {
  lessonId: string;
  lessonName: string;
  title: string;
  languageCode?: string | null;
  expReward?: number;
  lessonSeriesId?: string | null;
  lessonCategoryId?: string | null;
  lessonSubCategoryId?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  courseId?: string | null;
}

export interface LessonQuestion {
  lessonQuestionId: string;
  lessonId: string;
  languageCode?: string | null;
  question: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctOption?: string | null;
  skillType?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonProgress {
  lessonId: string;
  userId: string;
  score?: number;
  isDeleted?: boolean;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Integrated backend DTOs --- */
export interface UserGoalResponse {
  goalId: string;
  userId: string;
  languageCode: string;
  examName: string;
  targetScore?: number;
  targetSkill: string;
  customDescription: string;
  goalType: string;
  targetProficiency: string;
  targetDate: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface LessonProgressResponse {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt?: string | null;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonCategory {
  lessonCategoryId: string;
  lessonCategoryName?: string;
  languageCode?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonSeries {
  lessonSeriesId: string;
  lessonSeriesName: string;
  title: string;
  languageCode?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserSeriesProgress {
  seriesId: string;
  userId: string;
  currentIndex: number;
  isDeleted?: boolean;
  startedAt: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Course {
  courseId: string;
  title: string;
  languageCode?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  creatorId?: string | null;
  difficultyLevel?: string | null;
}

export interface CourseEnrollment {
  enrollmentId: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  completedAt?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  status: string;
}

/* --- Video & multimedia --- */
export interface Video {
  videoId: string;
  videoUrl: string;
  originalSubtitleUrl?: string | null;
  lessonId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface VideoSubtitle {
  videoSubtitleId: string;
  videoId: string;
  languageCode: string;
  subtitleUrl: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Memorization / Notes --- */
export interface UserMemorization {
  memorizationId: string;
  userId: string;
  contentType: string;
  contentId?: string | null;
  noteText?: string | null;
  isFavorite: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Social features --- */
export interface Friendship {
  user1Id: string;
  user2Id: string;
  status: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Room {
  roomId: string;
  roomName: string;
  creatorId?: string | null;
  maxMembers: number;
  purpose?: string | null;
  roomType: string;
  status: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  role?: string | null;
  isDeleted?: boolean;
  joinedAt: string;
  endAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ChatMessage {
  chatMessageId: string;
  content?: string | null;
  mediaUrl?: string | null;
  messageType?: string | null;
  roomId: string;
  senderId: string;
  isRead: boolean;
  isDeleted?: boolean;
  sentAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface MessageReaction {
  reactionId: string;
  chatMessageId: string;
  sentAt: string;
  userId: string;
  reaction: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Gamification --- */
export interface Event {
  eventId: string;
  eventName: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  eventType: string;
  maxScore: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserEvent {
  eventId: string;
  userId: string;
  score?: number;
  rank?: number | null;
  participatedAt: string;
  isCompleted: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LeaderboardEntry {
  leaderboardEntryId: {
    leaderboardId?: string | null;
    userId?: string | null;
  };
  score?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Leaderboard {
  leaderboardId: string;
  period?: string | null;
  tab?: string | null;
  snapshotDate?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- Reminders --- */
export interface UserReminder {
  id: string;
  userId: string;
  targetType: string;
  targetId?: string | null;
  title?: string | null;
  message?: string | null;
  reminderTime: string;
  reminderDate?: string | null;
  repeatType?: string | null;
  enabled: boolean;
  isDeleted?: boolean;
  createdAt?: string;
}

/* --- Learning activities --- */
export interface UserLearningActivity {
  activityId: string;
  userId: string;
  activityType: string;
  duration?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  targetId?: string | null;
}

/* --- Notifications --- */
export interface Notification {
  notificationId: string;
  userId: string;
  languageCode?: string | null;
  title: string;
  content?: string | null;
  type?: string | null;
  payload?: any | null;
  read: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/* --- User Goals & Roadmap --- */
export interface UserGoal {
  goalId: string;
  userId: string;
  languageCode?: string | null;
  certificate?: string | null;
  targetScore?: number | null;
  targetSkill?: string | null;
  customDescription?: string | null;
  goalType: string;
  targetProficiency?: string | null;
  targetDate?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Roadmap {
  roadmapId: string;
  languageCode: string;
  title: string;
  description?: string | null;
  completedItems: number;
  estimatedCompletionTime: number;
  totalItems: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
}

export interface UserRoadmap {
  userRoadmapId: string;
  roadmapId: string;
  userId: string;
  currentLevel: number;
  targetLevel?: string | null;
  targetProficiency?: string | null;
  estimatedCompletionTime?: number | null;
  completedItems: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
  language?: string | null;
}

export interface RoadmapItem {
  itemId: string;
  roadmapId: string;
  title: string;
  description?: string | null;
  type?: string | null;
  level?: number | null;
  estimatedTime?: number | null;
  orderIndex?: number | null;
  category?: string | null;
  difficulty?: string | null;
  expReward: number;
  contentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
}

export interface RoadmapMilestone {
  milestoneId: string;
  roadmapId: string;
  title: string;
  description?: string | null;
  level?: number | null;
  requirements?: string[] | null;
  rewards?: string[] | null;
  orderIndex?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
}

export interface RoadmapGuidance {
  guidanceId: string;
  itemId: string;
  stage?: string | null;
  title?: string | null;
  description?: string | null;
  tips?: string[] | null;
  estimatedTime?: number | null;
  orderIndex?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
}

export interface RoadmapResource {
  resourceId: string;
  itemId: string;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  contentId?: string | null;
  duration?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted: boolean;
}

/* --- Missing / other DB types (camelCase) --- */
export interface Character3D {
  character3dId: string;
  character3dName: string;
  description?: string | null;
  modelUrl?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Couple {
  user1Id: string;
  user2Id: string;
  status: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CourseDiscount {
  discountId: string;
  courseId: string;
  discountPercentage: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CourseReview {
  reviewId: string;
  courseId: string;
  userId: string;
  languageCode?: string | null;
  rating: number;
  comment?: string | null;
  reviewedAt: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface GroupAnswer {
  groupAnswerId: string;
  groupSessionId?: string | null;
  lessonQuestionId?: string | null;
  userId?: string | null;
  selectedOption?: string | null;
  isCorrect: boolean;
  isDeleted?: boolean;
  answeredAt: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface GroupSession {
  groupSessionId: string;
  lessonId?: string | null;
  roomId?: string | null;
  userId?: string | null;
  isDeleted?: boolean;
  startedAt: string;
  endedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface InvalidatedToken {
  token: string;
  expiryTime: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonSubCategory {
  lessonSubCategoryId: string;
  lessonSubCategoryName: string;
  lessonCategoryId?: string | null;
  languageCode?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonOrderInSeries {
  lessonId: string;
  lessonSeriesId: string;
  orderIndex: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonProgressWrongItem {
  lessonId: string;
  userId: string;
  lessonQuestionId: string;
  wrongAnswer?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LessonReview {
  reviewId: string;
  lessonId: string;
  userId: string;
  languageCode?: string | null;
  rating: number;
  comment?: string | null;
  reviewedAt: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Permission {
  permissionId: string;
  name: string;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  isRevoked: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  deviceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface RolePermission {
  permissionId: string;
  roleId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Role {
  roleId: string;
  roleName: string;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  description?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  status: string;
  provider: string;
  currency: string;
}

export interface UserCertificate {
  userId: string;
  certificate: string;
  createdAt?: string;
}

export interface UserFcmToken {
  userFcmTokenId: string;
  userId?: string | null;
  fcmToken: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserRole {
  roleId: string;
  userId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface VideoCallParticipant {
  videoCallId: string;
  userId: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface VideoCall {
  videoCallId: string;
  roomId?: string | null;
  callerId?: string | null;
  calleeId?: string | null;
  videoCallType?: string | null;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  qualityMetrics?: any | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CreateReviewRequest {
  userId: string;
  rating: number;
  content: string;
}

export interface VideoReviewResponse {
  reviewId: string;
  videoId: string;
  userId: string;
  rating: number;
  content: string;
  likeCount: number;
  dislikeCount: number;
  createdAt?: string;
  updatedAt?: string;
  userReaction?: number;
}

/* Request Interfaces from Java DTOs */
export interface LessonCategoryRequest {
  lessonCategoryName?: string;
  description?: string;
  isDeleted?: boolean;
}

export interface LessonSeriesRequest {
  lessonSeriesName: string;
  title: string;
  description?: string;
  isDeleted?: boolean;
}

export interface LessonQuestionRequest {
  lessonId?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  isDeleted?: boolean;
}

export interface LessonSubCategoryRequest {
  lessonSubCategoryId?: string;
  lessonSubCategoryName?: string;
  lessonCategoryId?: string;
  isDeleted?: boolean;
}

export interface LessonRequest {
  lessonName: string;
  title: string;
  languageCode?: string;
  expReward: number;
  creatorId?: string;
  skillType?: string;
  courseId?: string;
  lessonSeriesId?: string;
  lessonCategoryId?: string;
  lessonSubCategoryId?: string;
}

export interface LessonReviewRequest {
  lessonId: string;
  userId: string;
  rating: number;
  comment?: string;
  reviewedAt?: string;
  isDeleted?: boolean;
}

export interface LessonOrderInSeriesRequest {
  lessonId: string;
  lessonSeriesId: string;
  orderIndex: number;
  isDeleted?: boolean;
}

export interface LessonProgressRequest {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt?: string;
  isDeleted?: boolean;
}

/* Response Interfaces from Java DTOs */
export interface LessonCategoryResponse {
  lessonCategoryId: string;
  lessonCategoryName?: string;
  description?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonOrderInSeriesResponse {
  lessonId: string;
  lessonSeriesId: string;
  orderIndex?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonProgressResponse {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt?: string | null;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonProgressWrongItemResponse {
  lessonId: string;
  userId: string;
  lessonQuestionId: string;
  wrongAnswer?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonQuestionResponse {
  lessonQuestionId: string;
  lessonId: string;
  question: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonResponse {
  lessonId: string;
  lessonName?: string;
  title?: string;
  languageCode?: string;
  expReward?: number;
  courseId?: string;
  lessonSeriesId?: string;
  lessonCategoryId?: string;
  lessonSubCategoryId?: string;
  lessonType?: string;
  skillTypes?: string;
  flashcardCount?: number;
  dueFlashcardsCount?: number;
  videoUrls?: string[];
}

export interface LessonReviewResponse {
  reviewId: string;
  lessonId: string;
  userId: string;
  rating: number;
  comment?: string;
  reviewedAt?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonSeriesResponse {
  lessonSeriesId: string;
  lessonSeriesName: string;
  title: string;
  description?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonStatsResponse {
  lessonId: string;
  lessonName?: string;
  expReward?: number;
  completions?: number;
}

export interface LessonSubCategoryResponse {
  lessonSubCategoryId: string;
  lessonSubCategoryName: string;
  lessonCategoryId?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}
