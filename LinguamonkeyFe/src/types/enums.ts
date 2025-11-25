// src/types/enums.ts

export enum ActivityType {
    LESSON_START = "LESSON_START",
    LESSON_END = "LESSON_END",
    CHAT_START = "CHAT_START",
    FLASHCARD = "FLASHCARD",
    CHAT_END = "CHAT_END",
    GRAMMAR_EXERCISE = "GRAMMAR_EXERCISE",
    LESSON_COMPLETED = "LESSON_COMPLETED",
    DAILY_CHALLENGE_COMPLETED = "DAILY_CHALLENGE_COMPLETED",
    COURSE_ENROLL = "COURSE_ENROLL",
    BADGE_EARNED = "BADGE_EARNED",
    TRANSACTION_SUCCESS = "TRANSACTION_SUCCESS",
    DAILY_CHALLENGE_COMPLETE_GRAMMAR_EXERCISE = "DAILY_CHALLENGE_COMPLETE_GRAMMAR_EXERCISE",
    VIDEO_WATCH = "VIDEO_WATCH",
    LOGIN = "LOGIN",
    LESSON_COMPLETE = "LESSON_COMPLETE",
    COURSE_ENROLLED = "COURSE_ENROLLED",
    QUIZ_COMPLETE = "QUIZ_COMPLETE",
    GROUP_SESSION_JOINED = "GROUP_SESSION_JOINED",
    EXAM = "EXAM",
    START_LEARNING = "START_LEARNING",
    LESSON_COMPLETION = "LESSON_COMPLETION"
}

export enum AgeRange {
    AGE_13_17 = "AGE_13_17",
    AGE_18_24 = "AGE_18_24",
    AGE_25_34 = "AGE_25_34",
    AGE_35_44 = "AGE_35_44",
    AGE_45_54 = "AGE_45_54",
    AGE_55_PLUS = "AGE_55_PLUS"
}

export enum AuthProvider {
    EMAIL = "EMAIL",
    FACEBOOK = "FACEBOOK",
    QUICK_START = "QUICK_START",
    GOOGLE = "GOOGLE",
    PHONE = "PHONE"
}

export enum Certification {
    TOEFL = "TOEFL",
    IELTS = "IELTS",
    HSK = "HSK",
    JLPT = "JLPT",
    TOPIK = "TOPIK",
    DALF = "DALF",
    DELE = "DELE",
    GOETHE = "GOETHE"
}

export enum ContentType {
    NOTE = "NOTE",
    EVENT = "EVENT",
    LESSON = "LESSON",
    VIDEO = "VIDEO",
    VOCABULARY = "VOCABULARY",
    FORMULA = "FORMULA"
}

export enum Country {
    CHINA = "CHINA",
    TONGA = "TONGA",
    VIETNAM = "VIETNAM",
    KOREA = "KOREA",
    JAPAN = "JAPAN",
    UNITED_STATES = "UNITED_STATES",
    FRANCE = "FRANCE",
    GERMANY = "GERMANY",
    ICELAND = "ICELAND",
    ITALY = "ITALY",
    SPAIN = "SPAIN",
    SOUTH_KOREA = "SOUTH_KOREA",
    INDIA = "INDIA",
    Tonga = "Tonga",
    Korea = "Korea",
    Japan = "Japan"
}

export enum CoupleStatus {
    IN_LOVE = "IN_LOVE",
    BREAK_UP = "BREAK_UP",
    PENDING = "PENDING",
    EXPLORING = "EXPLORING",
    COUPLE = "COUPLE",
    EXPIRED = "EXPIRED"
}

export enum CourseApprovalStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum CourseEnrollmentStatus {
    COMPLETED = "COMPLETED",
    PAUSE = "PAUSE",
    ACTIVE = "ACTIVE"
}

export enum CourseType {
    FREE = "FREE",
    PAID = "PAID",
    PURCHASED = "PURCHASED"
}

export enum CriteriaType {
    LESSONS_COMPLETED = "LESSONS_COMPLETED",
    LOGIN_STREAK = "LOGIN_STREAK",
    POINTS_EARNED = "POINTS_EARNED",
    FRIENDS_MADE = "FRIENDS_MADE",
    DAILY_CHALLENGES_COMPLETED = "DAILY_CHALLENGES_COMPLETED",
    EXP_EARNED = "EXP_EARNED"
}

export enum DatingInviteStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}

export enum DifficultyLevel {
    A1 = "A1",
    A2 = "A2",
    B1 = "B1",
    B2 = "B2",
    C1 = "C1",
    C2 = "C2"
}

export enum EventType {
    VALENTINE = "VALENTINE",
    CHALLENGE = "CHALLENGE"
}

export enum FriendshipStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    BLOCKED = "BLOCKED"
}

export enum GoalType {
    COMMUNICATION = "COMMUNICATION",
    WORK = "WORK",
    PERSONAL_DEVELOPMENT = "PERSONAL_DEVELOPMENT",
    CERTIFICATE = "CERTIFICATE",
    TRAVEL = "TRAVEL",
    CERTIFICATION = "CERTIFICATION",
    EXAM = "EXAM",
    CONVERSATION = "CONVERSATION",
    BUSINESS = "BUSINESS",
    ACADEMIC = "ACADEMIC",
    CULTURE = "CULTURE",
    PROFICIENCY = "PROFICIENCY",
    OTHER = "OTHER",
    SKILL = "SKILL"
}

export enum LearningPace {
    SLOW = "SLOW",
    MAINTAIN = "MAINTAIN",
    FAST = "FAST",
    ACCELERATED = "ACCELERATED"
}

export enum LessonType {
    COURSE_LESSON = "COURSE_LESSON",
    FLASHCARD_SET = "FLASHCARD_SET",
    FLASHCARD = "FLASHCARD",
    QUIZ = "QUIZ",
    SPEAKING = "SPEAKING",
    VIDEO = "VIDEO"
}

export enum MediaType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    AUDIO = "AUDIO",
    DOCUMENT = "DOCUMENT",
    APPLICATION_OCTET_STREAM = "APPLICATION_OCTET_STREAM"
}

export enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    AUDIO = "AUDIO",
    TRANSLATION = "TRANSLATION"
}

export enum NotificationType {
    FLASHCARD_REMINDER = "FLASHCARD_REMINDER",
    USER_REMINDER = "USER_REMINDER",
    MESSAGE = "MESSAGE",
    FRIEND_REQUEST = "FRIEND_REQUEST",
    BADGE_UNLOCKED = "BADGE_UNLOCKED",
    LESSON_REMINDER = "LESSON_REMINDER",
    SYSTEM = "SYSTEM",
    STREAK_REMINDER = "STREAK_REMINDER",
    STREAK_RESET = "STREAK_RESET"
}

export enum PaymentStatus {
    UNPAIR = "UNPAIR",
    PAIR = "PAIR"
}

// PermissionName is complex and often not needed in full on FE, but mapping base names
export enum PermissionName {
    COURSE_MANAGE = "COURSE_MANAGE",
    LESSON_SUBMIT = "LESSON_SUBMIT",
    LESSON_REVIEW = "LESSON_REVIEW",
    LESSON_MANAGE = "LESSON_MANAGE",
    USER_MANAGE = "USER_MANAGE",
    ROLE_MANAGE = "ROLE_MANAGE",
    PERMISSION_MANAGE = "PERMISSION_MANAGE",
    LEADERBOARD_VIEW = "LEADERBOARD_VIEW",
    CHAT_SEND = "CHAT_SEND",
    CHAT_READ = "CHAT_READ",
    VIDEO_CALL_INITIATE = "VIDEO_CALL_INITIATE",
    NOTIFICATION_MANAGE = "NOTIFICATION_MANAGE",
    NOTIFICATION_VIEW = "NOTIFICATION_VIEW",
    AI_GENERATE_QUESTION = "AI_GENERATE_QUESTION",
    AI_ANALYZE_PRONUNCIATION = "AI_ANALYZE_PRONUNCIATION",
    AI_GRAMMAR_SUGGESTION = "AI_GRAMMAR_SUGGESTION",
    STATISTIC_VIEW = "STATISTIC_VIEW",
    REPORT_EXPORT = "REPORT_EXPORT",
    SYSTEM_SETTINGS_MANAGE = "SYSTEM_SETTINGS_MANAGE",
    PLATFORM_CHAT_INTEGRATION = "PLATFORM_CHAT_INTEGRATION",
    PLATFORM_VIDEO_INTEGRATION = "PLATFORM_VIDEO_INTEGRATION",
    GROUP_SESSION_MANAGE = "GROUP_SESSION_MANAGE",
    COUPLE_FEATURE_USE = "COUPLE_FEATURE_USE",
    BADGE_VIEW = "BADGE_VIEW",
    CHARACTER_3D_CUSTOMIZE = "CHARACTER_3D_CUSTOMIZE",
    CERTIFICATE_VIEW = "CERTIFICATE_VIEW",
    LEARNING_PROGRESS_TRACK = "LEARNING_PROGRESS_TRACK",
    USER_GOAL_MANAGE = "USER_GOAL_MANAGE",
    TRANSACTION_MANAGE = "TRANSACTION_MANAGE"
}

export enum ProficiencyLevel {
    A1 = "A1",
    A2 = "A2",
    B1 = "B1",
    B2 = "B2",
    C1 = "C1",
    C2 = "C2",
    NATIVE = "NATIVE"
}

export enum QuestionType {
    MCQ = "MCQ",
    FILL_BLANK = "FILL_BLANK",
    ORDERING = "ORDERING",
    MATCHING = "MATCHING",
    SPEAKING = "SPEAKING",
    WRITING = "WRITING",
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    FILL_IN_THE_BLANK = "FILL_IN_THE_BLANK",
    TRUE_FALSE = "TRUE_FALSE",
    SHORT_ANSWER = "SHORT_ANSWER"
}

export enum RepeatType {
    ONCE = "ONCE",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    ALWAYS = "ALWAYS"
}

export enum RoadmapType {
    GRAMMAR = "GRAMMAR",
    ENGLISH = "ENGLISH",
    DEFAULT = "DEFAULT",
    CEFR = "CEFR"
}

export enum RoleName {
    ADMIN = "ADMIN",
    TEACHER = "TEACHER",
    STUDENT = "STUDENT"
}

export enum RoomPurpose {
    QUIZ_TEAM = "QUIZ_TEAM",
    CALL = "CALL",
    PRIVATE_CHAT = "PRIVATE_CHAT",
    GROUP_CHAT = "GROUP_CHAT",
    AI_CHAT = "AI_CHAT",
    COUPLE = "COUPLE"
}

export enum RoomRole {
    MEMBER = "MEMBER",
    ADMIN = "ADMIN"
}

export enum RoomStatus {
    INACTIVE = "INACTIVE",
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED"
}

export enum RoomTopic {
    WORLD = "WORLD",
    VN = "VN",
    EN_LEARNING = "EN_LEARNING"
}

export enum RoomType {
    PRIVATE = "PRIVATE",
    PUBLIC = "PUBLIC",
    GROUP = "GROUP",
    COUPLE = "COUPLE"
}

export enum SkillType {
    LISTENING = "LISTENING",
    SPEAKING = "SPEAKING",
    READING = "READING",
    WRITING = "WRITING",
    VOCABULARY = "VOCABULARY",
    GRAMMAR = "GRAMMAR"
}

export interface BaseResponse {
    success: boolean;
    message?: string;
}

export interface Character3dResponse {
    character3dId: string;
    name: string;
    avatarUrl: string;
    modelUrl: string;
}

export interface BadgeResponse {
    badgeId: string;
    name: string;
    description: string;
    imageUrl: string;
    isEarned: boolean;
}

export interface UserStatsResponse {
    totalLessons: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    wordsLearned: number;
}

export enum FriendRequestStatus {
    NONE = 'NONE',
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export interface FriendRequestStatusResponse {
    status: FriendRequestStatus;
    senderId?: string;
    receiverId?: string;
}

export interface FriendshipResponse {
    friendshipId: string;
    friendId: string;
    friendName: string;
    friendAvatar: string;
    status: FriendRequestStatus;
    createdAt: string;
}

export interface DatingInviteSummary {
    inviteId: string;
    senderId: string;
    status: string;
    createdAt: string;
}


export interface CourseSummaryResponse {
    courseId: string;
    title: string;
    thumbnailUrl?: string;
    level: string;
    rating: number;
}

export interface MemorySummaryResponse {
    memoryId: string;
    title: string;
    date: string;
    imageUrl: string;
}

export interface CoupleProfileSummary {
    coupleId: string;
    partner1Id: string;
    partner2Id: string;
    anniversaryDate: string;
    level: number;
}

export enum TargetType {
    LESSON = "LESSON",
    EXAM = "EXAM",
    STREAK = "STREAK",
    EVENT = "EVENT",
    ROADMAP = "ROADMAP",
    FLASHCARD = "FLASHCARD",
    COUPLE = "COUPLE"
}

export enum TestStatus {
    IN_PROGRESS = "IN_PROGRESS",
    FINISHED = "FINISHED",
    REVIEW_PENDING = "REVIEW_PENDING"
}

export enum TransactionProvider {
    VNPAY = "VNPAY",
    STRIPE = "STRIPE",
    INTERNAL = "INTERNAL"
}

export enum TransactionStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    PENDING_REFUND = "PENDING_REFUND",
    REFUNDED = "REFUNDED",
    REJECTED = "REJECTED"
}

export enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    TRANSFER = "TRANSFER",
    PAYMENT = "PAYMENT",
    REFUND = "REFUND"
}

export enum VerificationStatus {
    SUBMITTED = "SUBMITTED",
    AI_PASS = "AI_PASS",
    AI_FAIL = "AI_FAIL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum VersionStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    PUBLIC = "PUBLIC",
    ARCHIVED = "ARCHIVED"
}

export enum VideoCallParticipantStatus {
    CONNECTED = "CONNECTED"
}

export enum VideoCallRole {
    GUEST = "GUEST",
    HOST = "HOST"
}

export enum VideoCallStatus {
    WAITING = "WAITING",
    ONGOING = "ONGOING",
    ENDED = "ENDED",
    INITIATED = "INITIATED"
}

export enum VideoCallType {
    ONE_ONE = "ONE_ONE",
    MANY = "MANY",
    ONE_TO_ONE = "ONE_TO_ONE"
}

export enum VideoType {
    ANIME = "ANIME",
    ANIMAL = "ANIMAL"
}