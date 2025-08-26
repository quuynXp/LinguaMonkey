export interface ApiResponse<T> {
  code: number;
  result?: T;
  message?: string;
}

export const languageToCountry: Record<string, string> = {
  vi: "VN",
  en: "US", // hoặc GB tùy bạn muốn flag nào
  ja: "JP",
  fr: "FR",
  ko: "KR",
  zh: "CN",
  es: "ES",
  de: "DE",
  it: "IT",
  ru: "RU",
  pt: "PT"
};

export type Country =
  | "CHINA" | "TONGA" | "VIETNAM" | "KOREA" | "JAPAN" | "UNITED_STATES"
  | "FRANCE" | "GERMANY" | "ITALY" | "SPAIN" | "SOUTH_KOREA" | "INDIA";

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

export interface RegisterResult  {
  user : User,
  accessToken: string,
  refreshToken: string
}

export interface LessonCategoryResponse { lessonCategoryId: string; lessonCategoryName?: string }
export interface LessonResponse { lessonId: string; lessonName?: string }
export interface LessonQuestionResponse  {
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

export interface Interest {
  interest_id: string;
  interest_name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserInterest {
  user_id: string;
  interest_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BilingualVideo {
  video_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  language_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Subtitle {
  subtitle_id: string;
  video_id: string;
  language_code: string;
  subtitle_url: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  note_id: string
  user_id: string
  target_id?: string
  target_type?: string
  content: string
  created_at: string
  updated_at: string
}

export interface Grammar {
  grammar_id: string
  title: string
  content: string
  description?: string
  examples?: string[]
  language_code?: string
  created_at: string
  updated_at: string
}

export interface GrammarTopic {
  topic_id: string
  topic_name: string
  language_code?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface GrammarRule {
  rule_id: string
  topic_id: string
  title: string
  content: string
  examples?: string[]
  created_at: string
  updated_at: string
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

// User related types
export interface User {
  user_id: string;
  email?: string | null;
  password?: string | null;
  fullname?: string | null;
  nickname?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  character3d_id?: string | null;
  native_language_code?: string | null;
  auth_provider?: string | null;
  country?: string | null;
  level: number;
  exp: number;
  streak: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  learning_pace?: string | null;
  age_range?: string | null;
  proficiency?: string | null;
}

export interface UserProfile {
  user_id: string;
  email: string;
  avatar_url?: string;
  character3d_id?: string;
  level?: number;
  exp?: number;
  streak: number,
  fullname: string;
  nickname: string;
  country: string;
  ageRange: string;
  nativeLanguageCode: string;
  languages: string[];
  certificationIds: string[];
  interestestIds: string[];
  goalIds: string[];
  learningPace: string;
  hasDonePlacementTest: boolean;
  authProvider: string;
}

export interface UserStats {
  totalStudyTime: number;
  lessonsCompleted: number;
  wordsLearned: number;
  testsCompleted: number;
  averageScore: number;
}

export interface UserBadge {
  badge_id: string;
  user_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Badge {
  badge_id: string;
  badge_name: string;
  description?: string | null;
  image_url?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserLanguage {
  language_code: string;
  user_id: string;
  proficiency_level?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Language {
  language_code: string;
  language_name: string;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Learning content types
export interface Lesson {
  lesson_id: string;
  lesson_name: string;
  title: string;
  language_code?: string | null;
  exp_reward: number;
  lesson_series_id?: string | null;
  lesson_category_id?: string | null;
  lesson_sub_category_id?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  course_id?: string | null;
}

export interface LessonQuestion {
  lesson_question_id: string;
  lesson_id: string;
  language_code?: string | null;
  question: string;
  optiona?: string | null;
  optionb?: string | null;
  optionc?: string | null;
  optiond?: string | null;
  correct_option?: string | null;
  skill_type?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonProgress {
  lesson_id: string;
  user_id: string;
  score: number;
  is_deleted?: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Integrated backend DTOs
export interface UserGoalResponse {
  goalId: string;
  userId: string;
  languageCode: string;
  examName: string;
  targetScore: number;
  targetSkill: string;
  customDescription: string;
  goalType: string;
  targetProficiency: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface LessonProgressResponse {
  lessonId: string;
  userId: string;
  score: number;
  completedAt: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonCategory {
  lesson_category_id: string;
  lesson_category_name: string;
  language_code?: string | null;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonSeries {
  lesson_series_id: string;
  lesson_series_name: string;
  title: string;
  language_code?: string | null;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserSeriesProgress {
  series_id: string;
  user_id: string;
  current_index: number;
  is_deleted?: boolean;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Course {
  course_id: string;
  title: string;
  language_code?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  creator_id?: string | null;
  difficulty_level?: string | null;
}

export interface CourseEnrollment {
  enrollment_id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  status: string;
}

// Video and multimedia types
export interface Video {
  video_id: string;
  video_url: string;
  original_subtitle_url?: string | null;
  lesson_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VideoSubtitle {
  video_subtitle_id: string;
  video_id: string;
  language_code: string;
  subtitle_url: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Memorization/Notes types
export interface UserMemorization {
  memorization_id: string;
  user_id: string;
  content_type: string;
  content_id?: string | null;
  note_text?: string | null;
  is_favorite: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Social features
export interface Friendship {
  user1_id: string;
  user2_id: string;
  status: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Room {
  room_id: string;
  room_name: string;
  creator_id?: string | null;
  max_members: number;
  purpose?: string | null;
  room_type: string;
  status: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  role?: string | null;
  is_deleted?: boolean;
  joined_at: string;
  end_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ChatMessage {
  chat_message_id: string;
  content?: string | null;
  media_url?: string | null;
  message_type?: string | null;
  room_id: string;
  sender_id: string;
  is_read: boolean;
  is_deleted?: boolean;
  sent_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MessageReaction {
  reaction_id: string;
  chat_message_id: string;
  sent_at: string;
  user_id: string;
  reaction: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Gamification
export interface Event {
  event_id: string;
  event_name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  max_score: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserEvent {
  event_id: string;
  user_id: string;
  score: number;
  rank?: number | null;
  participated_at: string;
  is_completed: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LeaderboardEntry {
  leaderboard_entry_id: {
     leaderboard_id?: string | null;
     user_id?: string | null;
  },
  score: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Leaderboard {
  leaderboard_id: string;
  period?: string | null;
  tab?: string | null;
  snapshot_date?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Reminders
export interface UserReminder {
  id: string;
  user_id: string;
  target_type: string;
  target_id?: string | null;
  title?: string | null;
  message?: string | null;
  reminder_time: string;
  reminder_date?: string | null;
  repeat_type?: string | null;
  enabled: boolean;
  is_deleted?: boolean;
  created_at: string;
}

// Learning activities
export interface UserLearningActivity {
  activity_id: string;
  user_id: string;
  activity_type: string;
  duration?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Notifications
export interface Notification {
  notification_id: string;
  user_id: string;
  language_code?: string | null;
  title: string;
  content?: string | null;
  type?: string | null;
  payload?: any | null;
  read: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// User Goals and Roadmap
export interface UserGoal {
  goal_id: string;
  user_id: string;
  language_code?: string | null;
  certificate?: string | null;
  target_score?: number | null;
  target_skill?: string | null;
  custom_description?: string | null;
  goal_type: string;
  target_proficiency?: string | null;
  target_date?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Roadmap {
  roadmap_id: string;
  language_code: string;
  title: string;
  description?: string | null;
  total_items: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface UserRoadmap {
  user_roadmap_id: string;
  roadmap_id: string;
  user_id: string;
  current_level: number;
  target_level?: number | null;
  target_proficiency?: string | null;
  estimated_completion_time?: number | null;
  completed_items: number;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface RoadmapItem {
  item_id: string;
  roadmap_id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  level?: number | null;
  estimated_time?: number | null;
  order_index?: number | null;
  category?: string | null;
  difficulty?: string | null;
  exp_reward: number;
  content_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface RoadmapMilestone {
  milestone_id: string;
  roadmap_id: string;
  title: string;
  description?: string | null;
  level?: number | null;
  requirements?: string[] | null;
  rewards?: string[] | null;
  order_index?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface RoadmapGuidance {
  guidance_id: string;
  item_id: string;
  stage?: string | null;
  title?: string | null;
  description?: string | null;
  tips?: string[] | null;
  estimated_time?: number | null;
  order_index?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

export interface RoadmapResource {
  resource_id: string;
  item_id: string;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  content_id?: string | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted: boolean;
}

// Missing types from DB
export interface Character3D {
  character3d_id: string;
  character3d_name: string;
  description?: string | null;
  model_url?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Couple {
  user1_id: string;
  user2_id: string;
  status: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CourseDiscount {
  discount_id: string;
  course_id: string;
  discount_percentage: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CourseReview {
  review_id: string;
  course_id: string;
  user_id: string;
  language_code?: string | null;
  rating: number;
  comment?: string | null;
  reviewed_at: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface GroupAnswer {
  group_answer_id: string;
  group_session_id?: string | null;
  lesson_question_id?: string | null;
  user_id?: string | null;
  selected_option?: string | null;
  is_correct: boolean;
  is_deleted?: boolean;
  answered_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface GroupSession {
  group_session_id: string;
  lesson_id?: string | null;
  room_id?: string | null;
  user_id?: string | null;
  is_deleted?: boolean;
  started_at: string;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface InvalidatedToken {
  token: string;
  expiry_time: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonSubCategory {
  lesson_sub_category_id: string;
  lesson_sub_category_name: string;
  lesson_category_id?: string | null;
  language_code?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonOrderInSeries {
  lesson_id: string;
  lesson_series_id: string;
  order_index: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonProgressWrongItem {
  lesson_id: string;
  user_id: string;
  lesson_question_id: string;
  wrong_answer?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LessonReview {
  review_id: string;
  lesson_id: string;
  user_id: string;
  language_code?: string | null;
  rating: number;
  comment?: string | null;
  reviewed_at: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Permission {
  permission_id: string;
  name: string;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  is_revoked: boolean;
  expires_at?: string | null;
  created_at: string;
  device_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

export interface RolePermission {
  permission_id: string;
  role_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Role {
  role_id: string;
  role_name: string;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  description?: string | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  status: string;
  provider: string;
}

export interface UserCertificate {
  user_id: string;
  certificate: string;
  created_at: string;
}

export interface UserFcmToken {
  user_fcm_token_id: string;
  user_id?: string | null;
  fcm_token: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserRole {
  role_id: string;
  user_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VideoCallParticipant {
  video_call_id: string;
  user_id: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VideoCall {
  video_call_id: string;
  room_id?: string | null;
  caller_id?: string | null;
  callee_id?: string | null;
  video_call_type?: string | null;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
  duration?: string | null;
  quality_metrics?: any | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}