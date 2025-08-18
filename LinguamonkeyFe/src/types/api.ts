export interface ApiResponse<T> {
  code: number;
  data?: T;
  message?: string;
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
  email: string;
  fullname: string;
  nickname?: string;
  phone?: string;
  avatar_url?: string;
  character3d_id?: string;
  native_language_code?: string;
  auth_provider?: string;
  country?: string;
  level: number;
  exp: number;
  streak: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  achievements: UserBadge[];
  stats: UserStats;
  isFriend: boolean;
  friendRequestSent: boolean;
  learningLanguages: UserLanguage[];
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
  badge: Badge;
  created_at: string;
}

export interface Badge {
  earned: unknown;
  badge_id: string;
  badge_name: string;
  description?: string;
  image_url?: string;
}

export interface UserLanguage {
  language_code: string;
  user_id: string;
  proficiency_level?: string;
  language: Language;
}

export interface Language {
  language_code: string;
  language_name: string;
  description?: string;
}

// Learning content types
export interface Lesson {
  lesson_id: string;
  lesson_name: string;
  title: string;
  language_code?: string;
  exp_reward: number;
  lesson_series_id?: string;
  lesson_category_id?: string;
  lesson_sub_category_id?: string;
  course_id?: string;
  created_at: string;
  updated_at: string;
  questions?: LessonQuestion[];
  progress?: LessonProgress;
  category?: LessonCategory;
  series?: LessonSeries;
  course?: Course;
}

export interface LessonQuestion {
  lesson_question_id: string;
  lesson_id: string;
  language_code?: string;
  question: string;
  optiona?: string;
  optionb?: string;
  optionc?: string;
  optiond?: string;
  correct_option?: string;
  skill_type?: string;
}

export interface LessonProgress {
  lesson_id: string;
  user_id: string;
  score: number;
  completed_at?: string;
  created_at: string;
  isDeleted?: boolean;
  updated_at?: string;
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

export interface LessonResponse {
  lessonId: string;
  lessonName: string;
  title: string;
  languageCode: string;
  expReward: number;
  courseId: string;
  lessonSeriesId: string;
  lessonCategoryId: string;
  lessonSubCategoryId: string;
  skillTypes: string[];
  videoUrls: string[];
}

// Other existing types remain unchanged...
export interface LessonCategory {
  lesson_category_id: string;
  lesson_category_name: string;
  language_code?: string;
  description?: string;
}

export interface LessonSeries {
  lesson_series_id: string;
  lesson_series_name: string;
  title: string;
  language_code?: string;
  description?: string;
  lessons?: Lesson[];
  progress?: UserSeriesProgress;
}

export interface UserSeriesProgress {
  series_id: string;
  user_id: string;
  current_index: number;
  started_at: string;
  completed_at?: string;
}

export interface Course {
  course_id: string;
  title: string;
  language_code?: string;
  description?: string;
  thumbnail_url?: string;
  lessons?: Lesson[];
  enrollment?: CourseEnrollment;
}

export interface CourseEnrollment {
  enrollment_id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at?: string;
}

// Video and multimedia types
export interface Video {
  video_id: string;
  video_url: string;
  original_subtitle_url?: string;
  lesson_id: string;
  lesson?: Lesson;
  subtitles?: VideoSubtitle[];
}

export interface VideoSubtitle {
  video_subtitle_id: string;
  video_id: string;
  language_code: string;
  subtitle_url: string;
}

// Memorization/Notes types
export interface UserMemorization {
  memorization_id: string;
  user_id: string;
  content_type: string;
  content_id?: string;
  note_text?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// Social features
export interface Friendship {
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  user1?: User
  user2?: User
}

export interface Room {
  room_id: string
  room_name: string
  creator_id?: string
  max_members: number
  purpose?: string
  room_type: string
  status: string
  created_at: string
  creator?: User
  members?: RoomMember[]
}

export interface RoomMember {
  room_id: string
  user_id: string
  role?: string
  joined_at: string
  end_at?: string
  user?: User
}

export interface ChatMessage {
  chat_message_id: string
  content?: string
  media_url?: string
  message_type?: string
  room_id: string
  sender_id: string
  is_read: boolean
  sent_at: string
  sender?: User
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  reaction_id: string
  chat_message_id: string
  sent_at: string
  user_id: string
  reaction: string
  user?: User
}

// Gamification
export interface Event {
  event_id: string
  event_name: string
  description?: string
  start_date: string
  end_date: string
  event_type: string
  max_score: number
}

export interface UserEvent {
  event_id: string
  user_id: string
  score: number
  rank?: number
  participated_at: string
  is_completed: boolean
  event?: Event
}

export interface Leaderboard {
  leaderboardEntryId: string;
  leaderboardId: string;
  userId: string;
  name: string;
  avatarUrl: string;
  rank: number;
  score: number;
  level: number;
  streak: number;
  change: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface LeaderboardEntry {
  leaderboard_entry_id: string
  leaderboard_id?: string
  user_id?: string
  rank: number
  score: number
  level: number
  streak: number
  change: number
  user?: User
}

// Reminders
export interface UserReminder {
  id: string
  user_id: string
  target_type: string
  target_id?: string
  title?: string
  message?: string
  reminder_time: string
  reminder_date?: string
  repeat_type?: string
  enabled: boolean
  created_at: string
}

// Learning activities
export interface UserLearningActivity {
  activity_id: string
  user_id: string
  activity_type: string
  duration?: string
  created_at: string
}

// Notifications
export interface Notification {
  notification_id: string
  user_id: string
  language_code?: string
  title: string
  content?: string
  type?: string
  payload?: any
  read: boolean
  created_at: string
}

// User Goals and Roadmap
export interface UserGoal {
  goal_id: string
  user_id: string
  language_code?: string
  exam_name?: string
  target_score?: number
  target_skill?: string
  custom_description?: string
  goal_type: string
  target_proficiency?: string
  target_date?: string
  created_at: string
  updated_at: string
}

export interface RoadmapItem {
  id: string
  title: string
  description: string
  type: 'lesson' | 'course' | 'series' | 'milestone' | 'assessment'
  level: number
  estimatedTime: number // in minutes
  prerequisites: string[]
  skills: string[]
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  progress: number // 0-100
  content_id?: string // lesson_id, course_id, etc.
  order_index: number
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  exp_reward: number
  created_at: string
}

export interface LearningRoadmap {
  roadmap_id: string
  user_id: string
  language_code: string
  current_level: number
  target_level: number
  target_proficiency: string
  estimated_completion_time: number // in days
  total_items: number
  completed_items: number
  items: RoadmapItem[]
  milestones: RoadmapMilestone[]
  created_at: string
  updated_at: string
}

export interface RoadmapMilestone {
  milestone_id: string
  title: string
  description: string
  level: number
  requirements: string[]
  rewards: string[]
  status: 'locked' | 'available' | 'completed'
  completed_at?: string
}

export interface RoadmapItemDetail {
  item: RoadmapItem
  guidance: RoadmapGuidance[]
  resources: RoadmapResource[]
  nextItems: RoadmapItem[]
  relatedItems: RoadmapItem[]
}

export interface RoadmapGuidance {
  stage: string
  title: string
  description: string
  tips: string[]
  estimatedTime: number
  order: number
}

export interface RoadmapResource {
  type: 'video' | 'article' | 'exercise' | 'quiz'
  title: string
  description: string
  url?: string
  content_id?: string
  duration?: number
}
