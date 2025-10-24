export interface ApiResponse<T> {
  code: number
  result?: T
  message?: string
}


export interface DailyChallenge {
  id: string; 
  title?: string | null;
  description?: string | null;
  baseExp?: number;
  rewardCoins?: number;
  difficulty?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UserDailyChallenge {
  id?: {
    userId?: string;
    challengeId?: string;
  };
  userId?: string;
  challengeId?: string;
  expReward?: number;
  rewardCoins?: number;
  progress?: number;
  isCompleted?: boolean;
  assignedAt?: string | null; 
  completedAt?: string | null;
  dailyChallenge?: DailyChallenge | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
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
}

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
  | "INDIA"

export type LearningPace = "SLOW" | "MAINTAIN" | "FAST" | "ACCELERATED"

export interface CreateUserPayload {
  username?: string
  email?: string | null
  password?: string
  fullname?: string | null
  nickname?: string | null
  phone?: string | null
  avatarUrl?: string | null
  character3dId?: string | null
  badgeId?: string | null
  ageRange?: string | null
  learningPace?: LearningPace
  interestestIds?: string[]
  goalIds?: string[] // ["CONVERSATION","BUSINESS"]
  certificationIds?: string[] // e.g. ["TOEFL","IELTS"]
  nativeLanguageCode?: string | null // "EN","VI",...
  country?: Country
  level?: number
  score?: number
  streak?: number
  languages?: string[]
}

export interface RegisterResult {
  user: User
  accessToken: string
  refreshToken: string
}

/* Generic responses / DTOs */
export interface LessonCategoryResponse {
  lessonCategoryId: string
  lessonCategoryName?: string
}
export interface LessonResponse {
  lessonId: string
  lessonName?: string
}
export interface LessonQuestionResponse {
  lessonQuestionId: string
  lessonId: string
  question: string
  optionA?: string
  optionB?: string
  optionC?: string
  optionD?: string
  correctOption?: string
}

export interface LessonProgressWrongItemRequest {
  lessonId: string
  userId: string
  lessonQuestionId: string
  wrongAnswer?: string
  isDeleted?: boolean
}

export interface UIQuestion {
  id: string
  lessonId: string
  question: string
  options: string[]
  correctIndex: number
}

export enum AgeRange {
  AGE_18_24 = "18_24",
  AGE_25_34 = "25_34",
  AGE_35_44 = "35_44",
  AGE_45_PLUS = "45_PLUS",
}

/* --- Entities (camelCase) --- */

export interface Interest {
  interestId: string
  interestName: string
  description?: string | null
  icon?: string | null
  color?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface UserInterest {
  userId: string
  interestId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface BilingualVideo {
  videoId: string
  title: string
  description?: string | null
  videoUrl: string
  thumbnailUrl?: string | null
  languageCode?: string | null
  createdAt: string
  updatedAt: string
  isLiked: boolean
  duration: string
  progress: number
}

export interface Subtitle {
  subtitleId: string
  videoId: string
  languageCode: string
  subtitleUrl: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  noteId: string
  userId: string
  targetId?: string | null
  targetType?: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface Grammar {
  grammarId: string
  title: string
  content: string
  description?: string | null
  examples?: string[] | null
  languageCode?: string | null
  createdAt: string
  updatedAt: string
}

export interface GrammarTopic {
  topicId: string
  topicName: string
  languageCode?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface GrammarRule {
  ruleId: string
  topicId: string
  title: string
  content: string
  examples?: string[] | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/* --- User related types --- */

export interface User {
  userId: string
  email?: string | null
  password?: string | null
  fullname?: string | null
  nickname?: string | null
  phone?: string | null
  avatarUrl?: string | null
  character3dId?: string | null
  nativeLanguageCode?: string | null
  authProvider?: string | null
  country?: string | null
  level: number
  exp: number
  streak: number
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  learningPace?: string | null
  ageRange?: string | null
  proficiency?: string | null
}

export interface UserProfile {
  userId: string
  email: string
  fullname: string
  nickname: string
  bio?: string
  phone?: string
  avatarUrl?: string
  character3dId?: string
  badgeId?: string
  nativeLanguageId?: string
  nativeLanguageCode?: string
  authProvider: string
  country: string
  ageRange?: string
  proficiency?: string
  level?: number
  exp?: number
  expToNextLevel?: number
  progress?: number
  streak: number
  languages: string[]
  certificationIds: string[]
  interestestIds: string[]
  goalIds: string[]
  learningPace: string
  hasDonePlacementTest: boolean
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}


export interface UserStats {
  totalStudyTime: number
  lessonsCompleted: number
  wordsLearned: number
  testsCompleted: number
  averageScore: number
}

export interface UserBadge {
  badgeId: string
  userId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Badge {
  badgeId: string
  badgeName: string
  description?: string | null
  imageUrl?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface UserLanguage {
  languageCode: string
  userId: string
  proficiencyLevel?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Language {
  languageCode: string
  languageName: string
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Learning content types --- */

export interface Lesson {
  lessonId: string
  lessonName: string
  title: string
  languageCode?: string | null
  expReward: number
  lessonSeriesId?: string | null
  lessonCategoryId?: string | null
  lessonSubCategoryId?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  courseId?: string | null
}

export interface LessonQuestion {
  lessonQuestionId: string
  lessonId: string
  languageCode?: string | null
  question: string
  optionA?: string | null
  optionB?: string | null
  optionC?: string | null
  optionD?: string | null
  correctOption?: string | null
  skillType?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonProgress {
  lessonId: string
  userId: string
  score: number
  isDeleted?: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Integrated backend DTOs --- */

export interface UserGoalResponse {
  goalId: string
  userId: string
  languageCode: string
  examName: string
  targetScore: number
  targetSkill: string
  customDescription: string
  goalType: string
  targetProficiency: string
  targetDate: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  deletedAt?: string | null
}

export interface LessonProgressResponse {
  lessonId: string
  userId: string
  score: number
  completedAt: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface LessonCategory {
  lessonCategoryId: string
  lessonCategoryName: string
  languageCode?: string | null
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonSeries {
  lessonSeriesId: string
  lessonSeriesName: string
  title: string
  languageCode?: string | null
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface UserSeriesProgress {
  seriesId: string
  userId: string
  currentIndex: number
  isDeleted?: boolean
  startedAt: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Course {
  courseId: string
  title: string
  languageCode?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  creatorId?: string | null
  difficultyLevel?: string | null
}

export interface CourseEnrollment {
  enrollmentId: string
  courseId: string
  userId: string
  enrolledAt: string
  completedAt?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  status: string
}

/* --- Video & multimedia --- */

export interface Video {
  videoId: string
  videoUrl: string
  originalSubtitleUrl?: string | null
  lessonId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface VideoSubtitle {
  videoSubtitleId: string
  videoId: string
  languageCode: string
  subtitleUrl: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Memorization / Notes --- */

export interface UserMemorization {
  memorizationId: string
  userId: string
  contentType: string
  contentId?: string | null
  noteText?: string | null
  isFavorite: boolean
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Social features --- */

export interface Friendship {
  user1Id: string
  user2Id: string
  status: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Room {
  roomId: string
  roomName: string
  creatorId?: string | null
  maxMembers: number
  purpose?: string | null
  roomType: string
  status: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface RoomMember {
  roomId: string
  userId: string
  role?: string | null
  isDeleted?: boolean
  joinedAt: string
  endAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface ChatMessage {
  chatMessageId: string
  content?: string | null
  mediaUrl?: string | null
  messageType?: string | null
  roomId: string
  senderId: string
  isRead: boolean
  isDeleted?: boolean
  sentAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface MessageReaction {
  reactionId: string
  chatMessageId: string
  sentAt: string
  userId: string
  reaction: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Gamification --- */

export interface Event {
  eventId: string
  eventName: string
  description?: string | null
  startDate: string
  endDate: string
  eventType: string
  maxScore: number
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface UserEvent {
  eventId: string
  userId: string
  score: number
  rank?: number | null
  participatedAt: string
  isCompleted: boolean
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LeaderboardEntry {
  leaderboardEntryId: {
    leaderboardId?: string | null
    userId?: string | null
  }
  score: number
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Leaderboard {
  leaderboardId: string
  period?: string | null
  tab?: string | null
  snapshotDate?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- Reminders --- */

export interface UserReminder {
  id: string
  userId: string
  targetType: string
  targetId?: string | null
  title?: string | null
  message?: string | null
  reminderTime: string
  reminderDate?: string | null
  repeatType?: string | null
  enabled: boolean
  isDeleted?: boolean
  createdAt: string
}

/* --- Learning activities --- */

export interface UserLearningActivity {
  activityId: string
  userId: string
  activityType: string
  duration?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  targetId?: string | null
}

/* --- Notifications --- */

export interface Notification {
  notificationId: string
  userId: string
  languageCode?: string | null
  title: string
  content?: string | null
  type?: string | null
  payload?: any | null
  read: boolean
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/* --- User Goals & Roadmap --- */

export interface UserGoal {
  goalId: string
  userId: string
  languageCode?: string | null
  certificate?: string | null
  targetScore?: number | null
  targetSkill?: string | null
  customDescription?: string | null
  goalType: string
  targetProficiency?: string | null
  targetDate?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Roadmap {
  roadmapId: string
  languageCode: string
  title: string
  description?: string | null
  completedItems : number
  estimatedCompletionTime : number
  totalItems: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

export interface UserRoadmap {
  userRoadmapId: string
  roadmapId: string
  userId: string
  currentLevel: number
  targetLevel?: number | null
  targetProficiency?: string | null
  estimatedCompletionTime?: number | null
  completedItems: number
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
  language?: string | null
}

export interface RoadmapItem {
  itemId: string
  roadmapId: string
  title: string
  description?: string | null
  type?: string | null
  level?: number | null
  estimatedTime?: number | null
  orderIndex?: number | null
  category?: string | null
  difficulty?: string | null
  expReward: number
  contentId?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

export interface RoadmapMilestone {
  milestoneId: string
  roadmapId: string
  title: string
  description?: string | null
  level?: number | null
  requirements?: string[] | null
  rewards?: string[] | null
  orderIndex?: number | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

export interface RoadmapGuidance {
  guidanceId: string
  itemId: string
  stage?: string | null
  title?: string | null
  description?: string | null
  tips?: string[] | null
  estimatedTime?: number | null
  orderIndex?: number | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

export interface RoadmapResource {
  resourceId: string
  itemId: string
  type?: string | null
  title?: string | null
  description?: string | null
  url?: string | null
  contentId?: string | null
  duration?: number | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

/* --- Missing / other DB types (camelCase) --- */

export interface Character3D {
  character3dId: string
  character3dName: string
  description?: string | null
  modelUrl?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Couple {
  user1Id: string
  user2Id: string
  status: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface CourseDiscount {
  discountId: string
  courseId: string
  discountPercentage: number
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface CourseReview {
  reviewId: string
  courseId: string
  userId: string
  languageCode?: string | null
  rating: number
  comment?: string | null
  reviewedAt: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface GroupAnswer {
  groupAnswerId: string
  groupSessionId?: string | null
  lessonQuestionId?: string | null
  userId?: string | null
  selectedOption?: string | null
  isCorrect: boolean
  isDeleted?: boolean
  answeredAt: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface GroupSession {
  groupSessionId: string
  lessonId?: string | null
  roomId?: string | null
  userId?: string | null
  isDeleted?: boolean
  startedAt: string
  endedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface InvalidatedToken {
  token: string
  expiryTime: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonSubCategory {
  lessonSubCategoryId: string
  lessonSubCategoryName: string
  lessonCategoryId?: string | null
  languageCode?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonOrderInSeries {
  lessonId: string
  lessonSeriesId: string
  orderIndex: number
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonProgressWrongItem {
  lessonId: string
  userId: string
  lessonQuestionId: string
  wrongAnswer?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface LessonReview {
  reviewId: string
  lessonId: string
  userId: string
  languageCode?: string | null
  rating: number
  comment?: string | null
  reviewedAt: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Permission {
  permissionId: string
  name: string
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface RefreshToken {
  id: string
  userId: string
  token: string
  isRevoked: boolean
  expiresAt?: string | null
  createdAt: string
  deviceId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export interface RolePermission {
  permissionId: string
  roleId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Role {
  roleId: string
  roleName: string
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Transaction {
  transactionId: string
  userId: string
  amount: number
  description?: string | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  status: string
  provider: string
  currency: string
}

export interface UserCertificate {
  userId: string
  certificate: string
  createdAt: string
}

export interface UserFcmToken {
  userFcmTokenId: string
  userId?: string | null
  fcmToken: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface UserRole {
  roleId: string
  userId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface VideoCallParticipant {
  videoCallId: string
  userId: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface VideoCall {
  videoCallId: string
  roomId?: string | null
  callerId?: string | null
  calleeId?: string | null
  videoCallType?: string | null
  status: string
  startTime?: string | null
  endTime?: string | null
  duration?: string | null
  qualityMetrics?: any | null
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}
