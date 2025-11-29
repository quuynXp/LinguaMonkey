import { ImageSourcePropType } from "react-native";

// =============================================================================
// 1. CORE & GENERIC TYPES
// =============================================================================

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

// =============================================================================
// 2. ENUMS (Mapping exact Java Enums)
// =============================================================================

export enum AuthProvider {
  LOCAL = "LOCAL",
  GOOGLE = "GOOGLE",
  FACEBOOK = "FACEBOOK",
}

export enum RoleName {
  ADMIN = "ADMIN",
  USER = "USER",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
}

export enum CourseType {
  SYSTEM = "SYSTEM",      // Khóa học của hệ thống
  COMMUNITY = "COMMUNITY" // Khóa học P2P do người dùng tạo
}

export enum CourseApprovalStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum VersionStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  PUBLIC = "PUBLIC",
  ARCHIVED = "ARCHIVED"
}

export enum TransactionProvider {
  VNPAY = "VNPAY",
  STRIPE = "STRIPE",
  PAYPAL = "PAYPAL",
  MOMO = "MOMO",
  INTERNAL = "INTERNAL" // Cho các giao dịch nội bộ như P2P transfer
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED"
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",    // Nạp tiền
  WITHDRAW = "WITHDRAW",  // Rút tiền
  PURCHASE = "PURCHASE",  // Mua khóa học
  TRANSFER = "TRANSFER",  // Chuyển tiền P2P
  REFUND = "REFUND"       // Hoàn tiền
}

export enum FriendshipStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  BLOCKED = "BLOCKED"
}

export enum NotificationType {
  SYSTEM = "SYSTEM",
  TRANSACTION = "TRANSACTION",
  COURSE = "COURSE",
  SOCIAL = "SOCIAL",
  REMINDER = "REMINDER"
}

export enum ActivityType {
  LESSON_COMPLETION = "LESSON_COMPLETION",
  DAILY_LOGIN = "DAILY_LOGIN",
  STREAK = "STREAK",
  QUIZ_SCORE = "QUIZ_SCORE"
}

// =============================================================================
// 3. DOMAIN MODELS (DTOs Matching Java Responses)
// =============================================================================

export interface UserProfileResponse {
  userId: string;
  fullname: string;
  nickname?: string;
  avatarUrl?: string;
  flag?: string;
  country?: string;
  level: number;
  exp: number;
  bio?: string;
  character3d?: Character3dResponse;
  stats?: UserStatsResponse;
  badges: BadgeResponse[];

  // Social Status
  isFriend: boolean;
  friendRequestStatus?: {
    status: "NONE" | "SENT" | "RECEIVED" | "BLOCKED";
    hasSentRequest: boolean;
    hasReceivedRequest: boolean;
  };
  canSendFriendRequest: boolean;

  // Teacher Info
  isTeacher: boolean;
  teacherCourses?: CourseSummaryResponse[];
}

export interface UserStatsResponse {
  totalStudyTime: number;
  lessonsCompleted: number;
  wordsLearned: number;
  testsCompleted: number;
  averageScore: number;
}

// --- WALLET & TRANSACTIONS (P2P Payment) ---

export interface WalletResponse {
  walletId: string;
  userId: string;
  balance: number; // BigDecimal -> number
  currency: string;
  isActive: boolean;
}

export interface TransactionResponse {
  transactionId: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
  type: TransactionType;
  provider: TransactionProvider;
  description?: string;
  paymentGatewayTransactionId?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// --- COURSES & LEARNING (P2P Content) ---

export interface CourseResponse {
  courseId: string;
  title: string;
  creatorId: string; // ID của giáo viên/người tạo
  price: number;
  languageCode?: string;
  approvalStatus: CourseApprovalStatus;
  createdAt: string;
  updatedAt: string;

  // Quan trọng: Java trả về version mới nhất
  latestPublicVersion?: CourseVersionResponse;
}

export interface CourseVersionResponse {
  versionId: string;
  courseId: string;
  versionNumber: number;
  status: VersionStatus;
  description?: string;
  thumbnailUrl?: string;
  reasonForChange?: string;
  publishedAt?: string;
  createdAt: string;

  // Danh sách bài học trong version này
  lessons?: CourseLessonResponse[];
}

export interface CourseSummaryResponse {
  courseId: string;
  title: string;
  thumbnailUrl?: string;
  price?: number;
  averageRating?: number;
}

export interface CourseLessonResponse {
  lessonId: string;
  title: string;
  orderIndex: number;
  isFree: boolean; // Cho học thử
  durationSeconds?: number;
}

export interface LessonResponse {
  lessonId: string;
  lessonName: string;
  title: string;
  languageCode: string;
  expReward: number;
  description?: string;
  difficultyLevel?: string;
  skillTypes?: string; // "LISTENING,SPEAKING"
  isFree: boolean;
  creatorId?: string;

  // Tài nguyên đi kèm
  videoUrls?: string[];
  flashcardCount?: number;
}

export interface CourseEnrollmentResponse {
  enrollmentId: string;
  courseVersion: {
    courseId: string;
    title: string;
    versionId: string;
  };
  userId: string;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  enrolledAt: string;
  completedAt?: string;
  progressPercent: number;
}

// --- CHARACTER & BADGES ---
export interface Character3dResponse {
  character3dId: string;
  character3dName: string;
  description?: string;
  modelUrl: string;
}

export interface BadgeResponse {
  badgeId: string;
  badgeName: string;
  description?: string;
  imageUrl: string;
  criteriaType: string;
  criteriaThreshold: number;
}

// =============================================================================
// 4. REQUEST PAYLOADS (Input for APIs)
// =============================================================================

// --- PAYMENT REQUESTS (Web Payment Logic) ---
export interface DepositRequest {
  userId: string;
  amount: number;
  provider: TransactionProvider; // VNPAY hoặc STRIPE
  returnUrl: string; // URL deep link để app mở lại sau khi thanh toán trên web
  currency: string; // "VND" hoặc "USD"
  description?: string;
}

export interface PaymentRequest extends DepositRequest {
  // Dùng chung cấu trúc với Deposit, nhưng có thể mở rộng
  courseId?: string; // Nếu thanh toán trực tiếp khóa học (tùy logic BE)
}

export interface WithdrawRequest {
  userId: string;
  amount: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

// --- COURSE CREATION (P2P) ---
export interface CreateCourseRequest {
  creatorId: string;
  title: string;
  price: number;
  languageCode: string; // "vi", "en"
  difficultyLevel: string;
}

export interface UpdateCourseVersionRequest {
  description?: string;
  thumbnailUrl?: string;
  lessonIds: string[]; // Danh sách ID bài học theo thứ tự
}

export interface PublishVersionRequest {
  reasonForChange: string;
}

// --- INTERACTION ---
export interface CreateReviewRequest {
  userId: string;
  rating: number;
  comment: string;
}

export interface ComprehensionQuestion {
  id: string;
  languageCode: string;
  question: string;
  options: string[];
  correctOption: string; // Thường sẽ bị ẩn nếu là bài kiểm tra, nhưng API trả về để hiển thị kết quả
}

export interface ListeningResponse {
  transcription: string;
  questions: ComprehensionQuestion[];
}

export interface PronunciationResponse {
  score: number;
  feedback: string; // Chuỗi JSON hoặc text feedback chi tiết từng từ
  phonemes: any[]; // Nếu BE trả về chi tiết âm vị
}

export interface SpellingResponse {
  corrections: string[]; // Danh sách gợi ý sửa lỗi
}

export interface ReadingResponse {
  passage: string;
  questions: ComprehensionQuestion[];
}

export interface WritingResponse {
  score: number;
  feedback: string;
  correctedText?: string;
}

export interface SpellingRequest {
  text: string;
  language: string;
}

export interface TranslationRequest {
  translatedText: string;
  targetLanguage: string;
}

// Cấu hình một bài test (Lấy từ /api/v1/tests/available)
// Maps to: proficiency_test_configs
export interface TestConfig {
  testConfigId: string; // SQL: test_config_id
  testType: string; // SQL: test_type
  title: string; // SQL: title
  description: string | null; // SQL: description
  numQuestions: number; // SQL: num_questions
}

// Câu hỏi được trả về khi bắt đầu test
// Maps to: test_session_questions
export interface TestQuestion {
  questionId: string; // SQL: question_id
  questionText: string; // SQL: question_text
  options: string[]; // SQL: options_json (assuming mapping)
  skillType: string | null; // SQL: skill_type
  orderIndex: number; // SQL: order_index
}

// Dữ liệu trả về khi bắt đầu test (từ /api/v1/tests/start)
// DTO - No direct table
export interface TestSessionStartData {
  sessionId: string;
  questions: TestQuestion[];
}

// Câu hỏi chi tiết có trong kết quả
// DTO extending TestQuestion, based on test_session_questions
export interface TestResultQuestion extends TestQuestion {
  userAnswerIndex: number | null; // SQL: user_answer_index
  correctAnswerIndex: number; // SQL: correct_answer_index
  isCorrect: boolean | null; // SQL: is_correct
  explanation: string | null; // SQL: explanation
}

// Kết quả trả về khi nộp bài (từ /api/v1/tests/sessions/{id}/submit)
// DTO based on test_sessions
export interface TestResult {
  sessionId: string; // SQL: test_session_id
  score: number | null; // SQL: score
  totalQuestions: number; // DTO field
  percentage: number | null; // SQL: percentage
  proficiencyEstimate: string | null; // SQL: proficiency_estimate
  questions: TestResultQuestion[]; // DTO field
}

// Maps to: daily_challenges
export interface DailDayChallenge {
  id: string, // SQL: id
  title: string, // SQL: title
  description: string | null, // SQL: description
  rewardCoins: number | null, // SQL: reward_coins
  difficulty: string // SQL: difficulty
}

// Maps to: user_daily_challenges (as a DTO)
export interface UserDailyChallenge {
  id: string, // DTO-specific ID (schema has composite PK)
  userId: string, // SQL: user_id
  challengeId: string, // Changed from 'challenge'. SQL: challenge_id
  expReward: number, // SQL: exp_reward
  rewardCoins: number | null, // SQL: reward_coins
  progress: number | null, // SQL: progress
  isCompleted: boolean | null, // SQL: is_completed
  assignedAt: string | null, // SQL: assigned_at
  completedAt: string | null // SQL: completed_at
}

// src/types/api.ts
// Maps to: basic_lessons
export interface BasicLessonResponse {
  basicLessonId: string; // Changed from 'id'. SQL: basic_lesson_id
  languageCode: 'en' | 'zh' | 'vi'; // SQL: language_code
  lessonType: string; // SQL: lesson_type
  symbol: string; // SQL: symbol
  romanization?: string | null; // SQL: romanization
  meaning?: string | null; // SQL: meaning
  pronunciationAudioUrl?: string | null; // SQL: pronunciation_audio_url
  videoUrl?: string | null; // SQL: video_url
  imageUrl?: string | null; // SQL: image_url
  exampleSentence?: string | null; // SQL: example_sentence
  exampleTranslation?: string | null; // SQL: example_translation
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
}


// DTO - No direct table
export interface QuizApiResponse {
  quizId: string;
  questions: QuizQuestion[];
}

// DTO based on user_learning_activities
export interface StudySession {
  activityId: string; // Changed from 'id'. SQL: activity_id
  activityType: string; // Changed from 'type'. SQL: activity_type
  title: string; // DTO field
  createdAt: string; // Changed from 'date'. SQL: created_at
  durationInSeconds: number | null; // Changed from 'duration'. SQL: duration_in_seconds
  score?: number; // DTO field
  maxScore?: number; // DTO field
  experience: number; // DTO field
  skills: string[]; // DTO field
  completed: boolean; // DTO field
}

/**
 * Khớp với StatsResponse.java từ backend
 * Đây là các chỉ số thống kê
 */
// DTO - No direct table
export interface StudyStats {
  totalSessions: number;
  totalTime: number; // in seconds
  totalExperience: number;
  averageScore: number; // percentage
}

/**
 * Khớp với TestResult (tạm thời, bạn có thể mở rộng sau)
 */
// DTO - No direct table (Duplicate interface name, this is a DTO)
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
// DTO - No direct table
export interface StudyHistoryResponse {
  sessions: StudySession[];
  tests: TestResult[];
  stats: StudyStats;
}

// DTO - No direct table
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

// DTO - No direct table
export interface RoomResponse {
  roomId: string;
  roomName: string;
}

// DTO based on users table
export interface UserResponse {
  userId: string; // SQL: user_id
  email: string | null; // SQL: email
  fullname: string | null; // SQL: fullname
  nickname: string | null; // SQL: nickname
  bio: string | null; // SQL: bio
  phone: string | null; // SQL: phone
  avatarUrl: string | null; // SQL: avatar_url
  character3dId: string | null; // SQL: character3d_id
  badgeId: string | null; // DTO field
  nativeLanguageCode: string | null; // Changed from 'nativeLanguageId'. SQL: native_language_code
  authProvider: string; // DTO field (from user_auth_accounts)
  country: string | null; // SQL: country
  level: number; // SQL: level
  exp: number; // SQL: exp
  expToNextLevel: number; // DTO field
  progress: number; // DTO field
  ageRange?: string; // Ví dụ: '18-24', '25-34', etc.
  learningPace?: string; // Ví dụ: 'casual', 'serious', etc.
  proficiency?: string; // Ví dụ: 'beginner', 'intermediate', etc.
  certificationIds?: string[]; // Hoặc kiểu dữ liệu đúng của nó
  goalIds?: string[]; // Hoặc kiểu dữ liệu đúng của nó
  interestIds?: string[];
  streak: number; // SQL: streak
  isDeleted: boolean; // SQL: is_deleted
  createdAt: string; // SQL: created_at
  updatedAt: string; // SQL: updated_at
  languages: string[]; // DTO field (from user_languages)
}

// DTO - No direct table
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
// DTO - No direct table
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
// DTO - No direct table (Duplicate)
export interface Player {
  id: string;
  name: string;
  avatar: string;
}

// Maps to: wallets
export interface Wallet {
  walletId: string; // SQL: wallet_id
  userId: string; // SQL: user_id
  balance: number; // SQL: balance
}

// Maps to: user_media
export interface UserMedia {
  id: string; // Changed from 'number'. SQL: id (uuid)
  userId: string; // SQL: user_id
  mediaType: MediaType; // SQL: media_type
  fileName: string | null; // SQL: file_name
  filePath: string | null; // SQL: file_path
  fileUrl: string | null; // SQL: file_url
  createdAt?: string | null; // SQL: created_at
}


// DTO - No direct table
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

// DTO - No direct table
export interface IPASound {
  symbol: string;
  example: string;
  audioUrl: string;
  type: "vowel" | "consonant";
  description: string;
}

// DTO - No direct table
export interface ConversationTopic {
  id: string;
  title: string;
  description: string;
  level: "basic" | "intermediate" | "advanced";
  icon: string;
  color: string;
  scenarios: string[];
}

// DTO - No direct table
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

// Maps to: flashcards (as a DTO)
export interface Flashcard {
  flashcardId: string; // Changed from 'id'. SQL: flashcard_id
  lessonId: string; // Changed from 'lessonId?'. SQL: lesson_id (NOT NULL)
  front: string; // Changed from 'word'. SQL: front
  back: string; // Changed from 'definition'. SQL: back
  exampleSentence?: string | null; // Changed from 'example'. SQL: example_sentence
  imageUrl?: string | null; // Changed from 'image'. SQL: image_url
  userId?: string | null; // Changed from 'author'. SQL: user_id
  tags?: string | null; // Changed from 'category'. SQL: tags
  nextReviewAt?: string | null; // SQL: next_review_at

  // DTO fields (not in schema table)
  isPublic?: boolean;
  likes?: number;
  isFavorite?: boolean;
  isLiked?: boolean;
  author?: string; // Kept original 'author' in case DTO uses it
  difficulty?: "beginner" | "intermediate" | "advanced";
  category?: string; // Kept original 'category' in case DTO uses it
}

// DTO - No direct table
export interface ReadingText {
  id: string;
  title: string;
  content: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  sentences: string[];
  vocabulary: string[];
}

// DTO - No direct table
export interface Translation {
  original: string;
  translated: string;
  isCorrect: boolean;
  suggestion?: string;
}

// Maps to: lesson_questions (as a DTO)
export interface QuizQuestion {
  lessonQuestionId: string; // Changed from 'id'. SQL: lesson_question_id
  question: string; // Changed from 'questionText'. SQL: question
  // 'question' field from original file removed as it duplicates 'question'
  // 'riddle' field from original file removed as it's not in schema
  category?: string; // DTO field
  options?: string[]; // Maps to options_json or optiona/b/c/d
  correctOption?: string | null; // Changed from 'correctAnswer'. SQL: correct_option
  correctAnswerIndex?: number; // DTO alias
  explainAnswer?: string | null; // Changed from 'explanation'. SQL: explain_answer
  questionType?: string | null; // Changed from 'type'. SQL: question_type
  difficulty?: "easy" | "medium" | "hard"; // DTO field
  skillType?: string | null; // Changed from 'skill'. SQL: skill_type
  weight?: number; // Changed from 'points'. SQL: weight (bigint)
}

// DTO - No direct table
export interface Sentence {
  id: string;
  text: string;
  phonetic: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  audioUrl: string;
}

// DTO - No direct table
export interface WordScore {
  word: string;
  score?: number;
  isCorrect: boolean;
  suggestion?: string;
}

// DTO - No direct table
export interface Topic {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  icon: string;
  color: string;
  contentCount: number;
}

// DTO - No direct table
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

// DTO - No direct table
export interface PronunciationResult {
  overallScore?: number;
  wordScores?: WordScore[];
  transcript?: string;
  suggestions?: string[];
}

// DTO - No direct table
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

// DTO - No direct table
export interface CreateUserPayload {
  fullname?: string;
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
  interestIds?: string[];
  goalIds?: string[]; // ["CONVERSATION","BUSINESS"]
  certificationIds?: string[]; // e.g. ["TOEFL","IELTS"]
  nativeLanguageCode?: string | null; // "EN","VI",...
  country?: Country;
  level?: number;
  score?: number;
  streak?: number;
  languages?: string[];
}

// DTO - No direct table
export interface RegisterResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Maps to: lesson_progress_wrong_items (as Request DTO)
export interface LessonProgressWrongItemRequest {
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  lessonQuestionId: string; // SQL: lesson_question_id
  wrongAnswer?: string | null; // SQL: wrong_answer
  isDeleted?: boolean; // SQL: is_deleted
}

// DTO - No direct table
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
// Maps to: interests
export interface Interest {
  interestId: string; // SQL: interest_id
  interestName: string; // SQL: interest_name
  description?: string | null; // SQL: description
  icon?: string | null; // SQL: icon
  color?: string | null; // SQL: color
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: user_interests
export interface UserInterest {
  userId: string; // SQL: user_id
  interestId: string; // SQL: interest_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// DTO - No direct table
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

// DTO - No direct table
export interface SubtitleRaw {
  subtitleId: string;
  videoId: string;
  languageCode: string;
  subtitleUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

// DTO - No direct table
export interface Subtitle extends SubtitleRaw {
  startTime: number;
  endTime: number;
  originalText?: string;
  translatedText?: string;
}

// DTO - No direct table
export interface VocabularyItem {
  word: string;
  pronunciation?: string;
  meaning?: string;
  timestamp: number;
}

// DTO - No direct table
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

// Maps to: user_memorizations
export interface Note {
  memorizationId: string; // Changed from 'noteId'. SQL: memorization_id
  userId: string; // SQL: user_id
  contentId?: string | null; // Changed from 'targetId'. SQL: content_id
  contentType: string; // Changed from 'targetType'. SQL: content_type
  noteText: string | null; // Changed from 'content'. SQL: note_text
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  // Added from schema
  isFavorite: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

// Maps to: grammar_topics
export interface GrammarTopic {
  id: number; // Changed from 'topicId: string'. SQL: id (serial)
  title: string; // Changed from 'topicName'. SQL: title
  languageCode?: string | null; // DTO field, not in schema
  description?: string | null; // SQL: description
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  rules?: GrammarRule[]; // DTO field
}

// Maps to: grammar_lessons
export interface GrammarRule {
  id: number; // Changed from 'ruleId: string'. SQL: id (serial)
  topicId: number; // Changed from 'topicId: string'. SQL: topic_id (integer)
  title: string; // SQL: title
  content: string; // Changed from 'explanation'. SQL: content (NOT NULL)
  examples?: string[] | null; // DTO field (related to grammar_examples)
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  exercises?: GrammarExercise[]; // DTO field
  userScore?: number | null; // DTO field
  // Added from schema
  level?: string | null;
  deletedAt?: string | null;
  isDeleted?: boolean;
}

// Maps to: grammar_examples (partially, this is a DTO)
export interface GrammarExercise {
  id: number; // Changed from 'exerciseId: string'. SQL: id (serial)
  lessonId: number; // Changed from 'ruleId: string'. SQL: lesson_id (integer)
  type: "fill-blank" | "multiple-choice" | "transformation" | string; // DTO field
  question?: string | null; // DTO field
  // Added from schema
  sentenceEn: string; // SQL: sentence_en
  sentenceVi: string; // SQL: sentence_vi
  options?: string[] | null; // DTO field
  correct?: string | null; // DTO field
  note?: string | null; // Changed from 'explanation'. SQL: note
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO - No direct table
export interface SubmitExerciseResponse {
  score?: number;
  total: number;
  correct: number;
  details: Record<string, boolean> | Record<string, boolean>;
}


/* --- User related types --- */
// Maps to: users
export interface User {
  userId: string; // SQL: user_id
  email?: string | null; // SQL: email
  password?: string | null; // SQL: password
  fullname?: string | null; // SQL: fullname
  nickname?: string | null; // SQL: nickname
  phone?: string | null; // SQL: phone
  avatarUrl?: string | null; // SQL: avatar_url
  character3dId?: string | null; // SQL: character3d_id
  nativeLanguageCode?: string | null; // SQL: native_language_code
  authProvider?: string | null; // DTO field
  country?: string | null; // SQL: country
  level?: number; // SQL: level
  exp?: number; // SQL: exp
  streak?: number; // SQL: streak
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  learningPace?: string | null; // SQL: learning_pace
  ageRange?: string | null; // SQL: age_range
  proficiency?: string | null; // SQL: proficiency
  lastActiveAt?: string | null; // Added from schema
  bio?: string | null; // Added from schema
}

// DTO - No direct table
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
  interestIds: string[];
  goalIds: string[];
  learningPace: string;
  hasDonePlacementTest: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// DTO - No direct table
export interface UserStats {
  totalStudyTime: number;
  lessonsCompleted: number;
  wordsLearned: number;
  testsCompleted: number;
  averageScore: number;
}

// Maps to: user_badges
export interface UserBadge {
  badgeId: string; // SQL: badge_id
  userId: string; // SQL: user_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: badges
export interface Badge {
  badgeId: string; // SQL: badge_id
  badgeName: string; // SQL: badge_name
  description?: string | null; // SQL: description
  imageUrl?: string | null; // SQL: image_url
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // Added from schema
  criteriaType?: string | null;
  criteriaThreshold?: number | null;
}

// Maps to: user_languages
export interface UserLanguage {
  languageCode: string; // SQL: language_code
  userId: string; // SQL: user_id
  proficiencyLevel?: string | null; // SQL: proficiency_level
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: languages
export interface Language {
  languageCode: string; // SQL: language_code
  languageName: string; // SQL: language_name
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- Learning content types --- */
// Maps to: lessons
export interface Lesson {
  lessonId: string; // SQL: lesson_id
  lessonName: string; // SQL: lesson_name
  title: string; // SQL: title
  languageCode?: string | null; // SQL: language_code
  expReward: number; // SQL: exp_reward
  lessonSeriesId?: string | null; // SQL: lesson_series_id
  lessonCategoryId?: string | null; // SQL: lesson_category_id
  lessonSubCategoryId?: string | null; // SQL: lesson_sub_category_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // courseId?: string | null; // Removed, not in schema
  // Added from schema
  lessonType?: string | null;
  skillTypes?: string | null;
  isFree: boolean;
  creatorId?: string | null; // SQL: "creator_id "
  description?: string | null;
  difficultyLevel?: string | null; // SQL: "difficulty_level "
  durationSeconds?: number | null; // SQL: duration_seconds (bigint)
  passScorePercent?: number | null; // SQL: pass_score_percent (bigint)
  certificateCode?: string | null;
  allowedRetakeCount: number; // SQL: allowed_retake_count (bigint)
  shuffleQuestions: boolean;
}

// Maps to: lesson_questions
export interface LessonQuestion {
  lessonQuestionId: string; // SQL: lesson_question_id
  lessonId: string; // SQL: lesson_id
  languageCode?: string | null; // SQL: language_code
  question: string; // SQL: question
  optiona?: string | null; // Changed from optionA. SQL: optiona
  optionb?: string | null; // Changed from optionB. SQL: optionb
  optionc?: string | null; // Changed from optionC. SQL: optionc
  optiond?: string | null; // Changed from optionD. SQL: optiond
  correctOption?: string | null; // SQL: correct_option
  skillType?: string | null; // SQL: skill_type
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // Added from schema
  questionType?: string | null;
  optionsJson?: string | null;
  mediaUrl?: string | null;
  weight: number; // SQL: weight (bigint)
  orderIndex?: number | null; // SQL: order_index (bigint)
  explainAnswer?: string | null;
}

// Maps to: lesson_progress
export interface LessonProgress {
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  score: number; // SQL: score (NOT NULL)
  isDeleted?: boolean; // SQL: is_deleted
  completedAt?: string | null; // SQL: completed_at
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // Added from schema
  maxScore?: number | null; // SQL: max_score (bigint)
  attemptNumber?: number | null; // SQL: attempt_number (bigint)
  needsReview: boolean; // SQL: needs_review
  answersJson?: string | null; // SQL: answers_json
}

/* --- Integrated backend DTOs --- */
// Maps to: user_goals
export interface UserGoalResponse {
  goalId: string; // SQL: goal_id
  userId: string; // SQL: user_id
  languageCode: string | null; // SQL: language_code
  certificate: string | null; // Changed from 'examName'. SQL: certificate
  targetScore?: number | null; // SQL: target_score
  targetSkill: string | null; // SQL: target_skill
  customDescription: string | null; // SQL: custom_description
  goalType: string; // SQL: goal_type
  targetProficiency: string | null; // SQL: target_proficiency
  targetDate: string | null; // SQL: target_date
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  isDeleted?: boolean; // SQL: is_deleted
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: lesson_categories
export interface LessonCategory {
  lessonCategoryId: string; // SQL: lesson_category_id
  lessonCategoryName?: string | null; // SQL: lesson_category_name
  languageCode?: string | null; // SQL: language_code
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: lesson_series
export interface LessonSeries {
  lessonSeriesId: string; // SQL: lesson_series_id
  lessonSeriesName: string; // SQL: lesson_series_name
  title: string; // SQL: title
  languageCode?: string | null; // SQL: language_code
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: user_series_progress
export interface UserSeriesProgress {
  seriesId: string; // SQL: series_id
  userId: string; // SQL: user_id
  currentIndex: number; // SQL: current_index
  isDeleted?: boolean; // SQL: is_deleted
  startedAt: string; // SQL: started_at
  completedAt?: string | null; // SQL: completed_at
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: courses (with DTO fields)
export interface Course {
  courseId: string; // SQL: course_id
  title: string; // SQL: title
  languageCode?: string | null; // SQL: language_code
  description?: string | null; // DTO field (not in courses table)
  thumbnailUrl?: string | null; // DTO field (not in courses table)
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  creatorId?: string | null; // SQL: creator_id
  difficultyLevel?: string | null; // SQL: difficulty_level
  // Added from schema
  approvalStatus?: string | null;
  price: number;
  latestPublicVersionId?: string | null;
}

// Maps to: course_enrollments
export interface CourseEnrollment {
  enrollmentId: string; // SQL: enrollment_id
  // courseId: string; // Removed, not in schema table
  courseVersionId: string | null; // Added from schema. SQL: course_version_id
  userId: string; // SQL: user_id
  enrolledAt: string; // SQL: enrolled_at
  completedAt?: string | null; // SQL: completed_at
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  status: string; // SQL: status
}

/* --- Video & multimedia --- */
// Maps to: videos
export interface Video {
  videoId: string; // SQL: video_id
  videoUrl: string; // SQL: video_url
  originalSubtitleUrl?: string | null; // SQL: original_subtitle_url
  lessonId: string; // SQL: lesson_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: video_subtitles
export interface VideoSubtitle {
  videoSubtitleId: string; // SQL: video_subtitle_id
  videoId: string; // SQL: video_id
  languageCode: string; // SQL: language_code
  subtitleUrl: string; // SQL: subtitle_url
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- Memorization / Notes --- */
// Maps to: user_memorizations
export interface UserMemorization {
  memorizationId: string; // SQL: memorization_id
  userId: string; // SQL: user_id
  contentType: string; // SQL: content_type
  contentId?: string | null; // SQL: content_id
  noteText?: string | null; // SQL: note_text
  isFavorite: boolean; // SQL: is_favorite
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- Social features --- */
// Maps to: friendships
export interface Friendship {
  user1Id: string; // SQL: user1_id
  user2Id: string; // SQL: user2_id
  status: string; // SQL: status
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: rooms
export interface Room {
  roomId: string; // SQL: room_id
  roomName: string; // SQL: room_name
  creatorId?: string | null; // SQL: creator_id
  maxMembers: number; // SQL: max_members
  purpose?: string | null; // SQL: purpose
  roomType: string; // SQL: room_type
  status: string; // SQL: status
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // Added from schema
  topic?: string | null;
  nickNameInRom?: string | null;
}

// Maps to: room_members
export interface RoomMember {
  roomId: string; // SQL: room_id
  userId: string; // SQL: user_id
  role?: string | null; // SQL: role
  isDeleted?: boolean; // SQL: is_deleted
  joinedAt: string; // SQL: joined_at
  endAt?: string | null; // SQL: end_at
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: chat_messages
export interface ChatMessage {
  chatMessageId: string; // SQL: chat_message_id
  content?: string | null; // SQL: content
  mediaUrl?: string | null; // SQL: media_url
  messageType?: string | null; // SQL: message_type
  roomId: string; // SQL: room_id
  senderId: string; // SQL: sender_id
  isRead: boolean; // SQL: is_read
  isDeleted?: boolean; // SQL: is_deleted
  sentAt: string; // SQL: sent_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  receiverId?: string | null; // Added from schema
}

// Maps to: message_reactions
export interface MessageReaction {
  reactionId: string; // SQL: reaction_id
  chatMessageId: string; // SQL: chat_message_id
  sentAt: string; // SQL: sent_at
  userId: string; // SQL: user_id
  reaction: string; // SQL: reaction
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- Gamification --- */
// Maps to: events
export interface Event {
  eventId: string; // SQL: event_id
  eventName: string; // SQL: event_name
  description?: string | null; // SQL: description
  startDate: string; // SQL: start_date
  endDate: string; // SQL: end_date
  eventType: string; // SQL: event_type
  maxScore: number; // SQL: max_score
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: user_events
export interface UserEvent {
  eventId: string; // SQL: event_id
  userId: string; // SQL: user_id
  score: number; // SQL: score
  rank?: number | null; // SQL: rank
  participatedAt: string; // SQL: participated_at
  isCompleted: boolean; // SQL: is_completed
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: leaderboard_entries
export interface LeaderboardEntry {
  // SQL: PK is (leaderboard_id, user_id)
  leaderboardId: string; // Added from schema
  userId: string; // Added from schema
  leaderboardEntryId: { // Original DTO structure
    leaderboardId?: string | null;
    userId?: string | null;
  };
  score?: number; // SQL: score
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: leaderboards
export interface Leaderboard {
  leaderboardId: string; // SQL: leaderboard_id
  period?: string | null; // SQL: period
  tab?: string | null; // SQL: tab
  snapshotDate?: string | null; // SQL: snapshot_date (date)
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- Reminders --- */
// Maps to: user_reminders
export interface UserReminder {
  id: string; // SQL: id
  userId: string; // SQL: user_id
  targetType: string; // SQL: target_type
  targetId?: string | null; // SQL: target_id
  title?: string | null; // SQL: title
  message?: string | null; // SQL: message
  reminderTime: string; // SQL: reminder_time
  reminderDate?: string | null; // SQL: reminder_date
  repeatType?: string | null; // SQL: repeat_type
  enabled: boolean | null; // SQL: enabled
  isDeleted?: boolean | null; // SQL: is_deleted
  createdAt?: string | null; // SQL: created_at
}

/* --- Learning activities --- */
// Maps to: user_learning_activities
export interface UserLearningActivity {
  activityId: string; // SQL: activity_id
  userId: string; // SQL: user_id
  activityType: string; // SQL: activity_type
  durationInSeconds?: number | null; // Changed from 'duration'. SQL: duration_in_seconds
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  targetId?: string | null; // SQL: target_id
  // Added from schema
  details?: string | null;
  relatedEntityId?: string | null;
}

/* --- Notifications --- */
// Maps to: notifications
export interface Notification {
  notificationId: string; // SQL: notification_id
  userId: string; // SQL: user_id
  languageCode?: string | null; // SQL: language_code
  title: string; // SQL: title
  content?: string | null; // SQL: content
  type?: string | null; // SQL: type
  payload?: any | null; // SQL: payload (varchar)
  read: boolean; // SQL: read
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

/* --- User Goals & Roadmap --- */
// Maps to: user_goals
export interface UserGoal {
  goalId: string; // SQL: goal_id
  userId: string; // SQL: user_id
  languageCode?: string | null; // SQL: language_code
  certificate?: string | null; // SQL: certificate
  targetScore?: number | null; // SQL: target_score
  targetSkill?: string | null; // SQL: target_skill
  customDescription?: string | null; // SQL: custom_description
  goalType: string; // SQL: goal_type
  targetProficiency?: string | null; // SQL: target_proficiency
  targetDate?: string | null; // SQL: target_date
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: roadmaps (as a DTO)
export interface Roadmap {
  roadmapId: string; // SQL: roadmap_id
  languageCode: string; // SQL: language_code
  title: string; // SQL: title
  description?: string | null; // SQL: description
  completedItems: number; // DTO field
  estimatedCompletionTime: number; // DTO field
  totalItems: number; // SQL: total_items
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
  type?: string | null; // Added from schema
}

// Maps to: user_roadmaps
export interface UserRoadmap {
  userRoadmapId: string; // SQL: user_roadmap_id
  roadmapId: string; // SQL: roadmap_id
  userId: string; // SQL: user_id
  currentLevel: number; // SQL: current_level
  targetLevel?: number | null; // Changed from 'string'. SQL: target_level (integer)
  targetProficiency?: string | null; // SQL: target_proficiency
  estimatedCompletionTime?: number | null; // SQL: estimated_completion_time
  completedItems: number; // SQL: completed_items
  status: string; // SQL: status
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
  language?: string | null; // SQL: language
}

// Maps to: roadmap_items
export interface RoadmapItem {
  itemId: string; // SQL: item_id
  roadmapId: string; // SQL: roadmap_id
  title: string; // SQL: title
  description?: string | null; // SQL: description
  type?: string | null; // SQL: type
  level?: number | null; // SQL: level
  estimatedTime?: number | null; // SQL: estimated_time
  orderIndex?: number | null; // SQL: order_index
  category?: string | null; // SQL: category
  difficulty?: string | null; // SQL: difficulty
  expReward: number; // SQL: exp_reward
  contentId?: string | null; // SQL: content_id
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
}

// Maps to: roadmap_milestones
export interface RoadmapMilestone {
  milestoneId: string; // SQL: milestone_id
  roadmapId: string; // SQL: roadmap_id
  title: string; // SQL: title
  description?: string | null; // SQL: description
  level?: number | null; // SQL: level
  requirements?: string[] | null; // SQL: requirements (text[])
  rewards?: string[] | null; // SQL: rewards (text[])
  orderIndex?: number | null; // SQL: order_index
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
}

// Maps to: roadmap_guidance
export interface RoadmapGuidance {
  guidanceId: string; // SQL: guidance_id
  itemId: string; // SQL: item_id
  stage?: string | null; // SQL: stage
  title?: string | null; // SQL: title
  description?: string | null; // SQL: description
  tips?: string[] | null; // SQL: tips (text[])
  estimatedTime?: number | null; // SQL: estimated_time
  orderIndex?: number | null; // SQL: order_index
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
}

// Maps to: roadmap_resources
export interface RoadmapResource {
  resourceId: string; // SQL: resource_id
  itemId: string; // SQL: item_id
  type?: string | null; // SQL: type
  title?: string | null; // SQL: title
  description?: string | null; // SQL: description
  url?: string | null; // SQL: url
  contentId?: string | null; // SQL: content_id
  duration?: number | null; // SQL: duration
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  isDeleted: boolean | null; // SQL: is_deleted
}

/* --- Missing / other DB types (camelCase) --- */
// Maps to: character3ds
export interface Character3D {
  character3dId: string; // SQL: character3d_id
  character3dName: string; // SQL: character3d_name
  description?: string | null; // SQL: description
  modelUrl?: string | null; // SQL: model_url
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: couples
export interface Couple {
  id: string; // Added from schema. SQL: id
  user1Id: string; // SQL: user1_id
  user2Id: string; // SQL: user2_id
  status: string; // SQL: status
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  // Added from schema
  exploringStart?: string | null;
  exploringExpiresAt?: string | null;
  coupleStartDate?: string | null;
  coupleScore?: number | null;
}

// Maps to: course_discounts
export interface CourseDiscount {
  discountId: string; // SQL: discount_id
  courseId: string; // SQL: course_id
  discountPercentage: number; // SQL: discount_percentage
  startDate?: string | null; // SQL: start_date
  endDate?: string | null; // SQL: end_date
  isActive: boolean; // SQL: is_active
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: course_reviews
export interface CourseReview {
  reviewId: string; // SQL: review_id
  courseId: string; // SQL: course_id
  userId: string; // SQL: user_id
  languageCode?: string | null; // SQL: language_code
  rating: number; // SQL: rating (numeric)
  comment?: string | null; // SQL: comment
  reviewedAt: string; // SQL: reviewed_at
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: group_answers
export interface GroupAnswer {
  groupAnswerId: string; // SQL: group_answer_id
  groupSessionId?: string | null; // SQL: group_session_id
  lessonQuestionId?: string | null; // SQL: lesson_question_id
  userId?: string | null; // SQL: user_id
  selectedOption?: string | null; // SQL: selected_option
  isCorrect: boolean; // SQL: is_correct
  isDeleted?: boolean; // SQL: is_deleted
  answeredAt: string; // SQL: answered_at
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: group_sessions
export interface GroupSession {
  groupSessionId: string; // SQL: group_session_id
  lessonId?: string | null; // SQL: lesson_id
  roomId?: string | null; // SQL: room_id
  userId?: string | null; // SQL: user_id
  isDeleted?: boolean; // SQL: is_deleted
  startedAt: string; // SQL: started_at
  endedAt?: string | null; // SQL: ended_at
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: invalidated_tokens
export interface InvalidatedToken {
  token: string; // SQL: token
  expiryTime: string; // SQL: expiry_time
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: lesson_sub_categories
export interface LessonSubCategory {
  lessonSubCategoryId: string; // SQL: lesson_sub_category_id
  lessonSubCategoryName: string; // SQL: lesson_sub_category_name
  lessonCategoryId?: string | null; // SQL: lesson_category_id
  languageCode?: string | null; // SQL: language_code
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: lesson_order_in_series
export interface LessonOrderInSeries {
  lessonId: string; // SQL: lesson_id
  lessonSeriesId: string; // SQL: lesson_series_id
  orderIndex: number; // SQL: order_index
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: lesson_progress_wrong_items
export interface LessonProgressWrongItem {
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  lessonQuestionId: string; // SQL: lesson_question_id
  wrongAnswer?: string | null; // SQL: wrong_answer
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  attemptNumber: number; // Added from schema
}

// Maps to: lesson_reviews
export interface LessonReview {
  reviewId: string; // SQL: review_id
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  languageCode?: string | null; // SQL: language_code
  rating: number; // SQL: rating (numeric)
  comment?: string | null; // SQL: comment
  reviewedAt: string; // SQL: reviewed_at
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  verified?: boolean | null; // Added from schema
}

// Maps to: permissions
export interface Permission {
  permissionId: string; // SQL: permission_id
  name: string; // SQL: name
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: refresh_tokens
export interface RefreshToken {
  id: string; // SQL: id
  userId: string; // SQL: user_id
  token: string; // SQL: token
  isRevoked: boolean; // SQL: is_revoked
  expiresAt?: string | null; // SQL: expires_at
  createdAt?: string; // SQL: created_at
  deviceId?: string | null; // SQL: device_id
  ip?: string | null; // SQL: ip
  userAgent?: string | null; // SQL: user_agent
}

// Maps to: role_permissions
export interface RolePermission {
  permissionId: string; // SQL: permission_id
  roleId: string; // SQL: role_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: roles
export interface Role {
  roleId: string; // SQL: role_id
  roleName: string; // SQL: role_name
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: transactions
export interface Transaction {
  transactionId: string; // SQL: transaction_id
  userId: string; // SQL: user_id
  amount: number; // SQL: amount (double precision)
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
  status: string; // SQL: status
  provider: string; // SQL: provider
  currency: string; // SQL: currency
  // Added from schema
  walletId?: string | null;
  senderId?: string | null;
  receiverId?: string | null;
  originalTransactionId?: string | null;
  type: string;
  paymentGatewayTransactionId?: string | null;
  idempotencyKey?: string | null;
}

// Maps to: user_certificates
export interface UserCertificate {
  userId: string; // SQL: user_id
  certificate: string; // SQL: certificate
  createdAt?: string; // SQL: created_at (time with time zone)
}

// Maps to: user_fcm_tokens
export interface UserFcmToken {
  userFcmTokenId: string; // SQL: user_fcm_token_id
  userId?: string | null; // SQL: user_id
  fcmToken: string; // SQL: fcm_token
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: user_roles
export interface UserRole {
  roleId: string; // SQL: role_id
  userId: string; // SQL: user_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: video_call_participants
export interface VideoCallParticipant {
  videoCallId: string; // SQL: video_call_id
  userId: string; // SQL: user_id
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}

// Maps to: video_calls
export interface VideoCall {
  videoCallId: string; // SQL: video_call_id
  roomId?: string | null; // SQL: room_id
  callerId?: string | null; // SQL: caller_id
  calleeId?: string | null; // SQL: callee_id
  videoCallType?: string | null; // SQL: video_call_type
  status: string; // SQL: status
  startTime?: string | null; // SQL: start_time
  endTime?: string | null; // SQL: end_time
  duration?: string | null; // SQL: duration (interval)
  qualityMetrics?: any | null; // SQL: quality_metrics (jsonb)
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
  deletedAt?: string | null; // SQL: deleted_at
}


// DTO based on video_reviews
export interface VideoReviewResponse {
  reviewId: string; // SQL: review_id
  videoId: string; // SQL: video_id
  userId: string; // SQL: user_id
  rating: number | null; // SQL: rating (integer)
  content: string | null; // SQL: content
  likeCount: number; // DTO field
  dislikeCount: number; // DTO field
  createdAt?: string | null; // SQL: created_at
  updatedAt?: string | null; // SQL: updated_at
  userReaction?: number; // DTO field
}

/* Request Interfaces from Java DTOs */
// DTO - No direct table
export interface LessonCategoryRequest {
  lessonCategoryName?: string;
  description?: string;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonSeriesRequest {
  lessonSeriesName: string;
  title: string;
  description?: string;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonQuestionRequest {
  lessonId?: string;
  question?: string;
  optiona?: string; // Changed from optionA
  optionb?: string; // Changed from optionB
  optionc?: string; // Changed from optionC
  optiond?: string; // Changed from optionD
  correctOption?: string;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonSubCategoryRequest {
  lessonSubCategoryId?: string;
  lessonSubCategoryName?: string;
  lessonCategoryId?: string;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonRequest {
  lessonName: string;
  title: string;
  languageCode?: string;
  expReward: number;
  creatorId?: string;
  skillType?: string;
  // courseId?: string; // Removed, not in schema
  lessonSeriesId?: string;
  lessonCategoryId?: string;
  lessonSubCategoryId?: string;
}

// DTO - No direct table
export interface LessonReviewRequest {
  lessonId: string;
  userId: string;
  rating: number;
  comment?: string;
  reviewedAt?: string;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonOrderInSeriesRequest {
  lessonId: string;
  lessonSeriesId: string;
  orderIndex: number;
  isDeleted?: boolean;
}

// DTO - No direct table
export interface LessonProgressRequest {
  lessonId: string;
  userId: string;
  score?: number;
  completedAt?: string;
  isDeleted?: boolean;
}

/* Response Interfaces from Java DTOs */
// DTO based on lesson_categories
export interface LessonCategoryResponse {
  lessonCategoryId: string; // SQL: lesson_category_id
  lessonCategoryName?: string | null; // SQL: lesson_category_name
  description?: string | null; // SQL: description
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_order_in_series
export interface LessonOrderInSeriesResponse {
  lessonId: string; // SQL: lesson_id
  lessonSeriesId: string; // SQL: lesson_series_id
  orderIndex?: number; // SQL: order_index
  isDeleted?: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_progress
export interface LessonProgressResponse {
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  score?: number; // SQL: score
  completedAt?: string | null; // SQL: completed_at
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_progress_wrong_items
export interface LessonProgressWrongItemResponse {
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  lessonQuestionId: string; // SQL: lesson_question_id
  wrongAnswer?: string | null; // SQL: wrong_answer
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_questions
export interface LessonQuestionResponse {
  lessonQuestionId: string; // SQL: lesson_question_id
  lessonId: string; // SQL: lesson_id
  question: string; // SQL: question
  optiona?: string | null; // Changed from optionA. SQL: optiona
  optionb?: string | null; // Changed from optionB. SQL: optionb
  optionc?: string | null; // Changed from optionC. SQL: optionc
  optiond?: string | null; // Changed from optionD. SQL: optiond
  correctOption?: string | null; // SQL: correct_option
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_reviews
export interface LessonReviewResponse {
  reviewId: string; // SQL: review_id
  lessonId: string; // SQL: lesson_id
  userId: string; // SQL: user_id
  rating: number; // SQL: rating (numeric)
  comment?: string | null; // SQL: comment
  reviewedAt?: string; // SQL: reviewed_at
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO based on lesson_series
export interface LessonSeriesResponse {
  lessonSeriesId: string; // SQL: lesson_series_id
  lessonSeriesName: string; // SQL: lesson_series_name
  title: string; // SQL: title
  description?: string | null; // SQL: description
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}

// DTO - No direct table
export interface LessonStatsResponse {
  lessonId: string;
  lessonName?: string;
  expReward?: number;
  completions?: number;
}

// DTO based on lesson_sub_categories
export interface LessonSubCategoryResponse {
  lessonSubCategoryId: string; // SQL: lesson_sub_category_id
  lessonSubCategoryName: string; // SQL: lesson_sub_category_name
  lessonCategoryId?: string | null; // SQL: lesson_category_id
  isDeleted: boolean; // SQL: is_deleted
  createdAt?: string; // SQL: created_at
  updatedAt?: string; // SQL: updated_at
}