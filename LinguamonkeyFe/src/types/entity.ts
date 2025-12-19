import { UserProfileResponse } from './api';
// src/types/entity.ts
import * as Enums from './enums';

export interface BaseEntity {
    createdAt: string; // OffsetDateTime -> string
    updatedAt: string;
    deletedAt?: string;
    isDeleted: boolean;
}

// --- Embeddable IDs ---

export interface ChatMessagesId {
    chatMessageId: string; // UUID
    sentAt: string;
}

export interface CouplesId {
    user1Id: string;
    user2Id: string;
}

export interface CourseLessonId {
    courseId: string;
    lessonId: string;
}

export interface CourseVersionLessonId {
    versionId: string;
    lessonId: string;
}

export interface FriendshipId {
    user1Id: string; // requester_id
    user2Id: string; // receiver_id
}

export interface GrammarProgressId {
    topicId: string;
    userId: string;
    ruleId: string;
}

export interface LeaderboardEntryId {
    leaderboardId: string;
    userId: string;
}

export interface LessonOrderInSeriesId {
    lessonId: string;
    lessonSeriesId: string;
}

export interface LessonProgressId {
    lessonId: string;
    userId: string;
}

export interface LessonProgressWrongItemsId {
    lessonId: string;
    userId: string;
    lessonQuestionId: string;
    attemptNumber?: number;
}

export interface RolePermissionId {
    permissionId: string;
    roleId: string;
}

export interface RoomMemberId {
    roomId: string;
    userId: string;
}

export interface UserBadgeId {
    badgeId: string;
    userId: string;
}

export interface UserCertificateId {
    userId: string;
    certificate: string; // Enum name
}

export interface UserDailyChallengeId {
    userId: string;
    challengeId: string;
    assignedDate?: string;
    stack?: number;
}

export interface UserEventId {
    eventId: string;
    userId: string;
}

export interface UserInterestId {
    userId: string;
    interestId: string;
}

export interface UserLanguageId {
    languageCode: string;
    userId: string;
}

export interface UserRoadmapId {
    userId: string;
    roadmapId: string;
}

export interface UserRoleId {
    userId: string;
    roleId: string;
}

export interface UserSeriesProgressId {
    seriesId: string;
    userId: string;
}

export interface VideoCallParticipantId {
    videoCallId: string;
    userId: string;
}

// --- Entities ---

export interface Admiration {
    admirationId: string;
    userId: string;
    senderId: string;
    createdAt: string;
}

export interface Badge extends BaseEntity {
    badgeId: string;
    badgeName: string;
    description?: string;
    imageUrl?: string;
    criteriaType: Enums.CriteriaType;
    criteriaThreshold: number;
}

export interface BasicLesson extends BaseEntity {
    id: string; // basic_lesson_id
    languageCode: string;
    symbol: string;
    romanization?: string;
    meaning?: string;
    pronunciationAudioUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    exampleSentence?: string;
    exampleTranslation?: string;
    lessonType: string;
}

export interface Character3d extends BaseEntity {
    character3dId: string;
    character3dName: string;
    description?: string;
    modelUrl?: string;
}

export interface ChatMessage {
    id: ChatMessagesId;

    content?: string;
    mediaUrl?: string;
    messageType: Enums.MessageType;
    roomId: string;
    senderId: string;
    receiverId?: string;
    isDeleted: boolean;
    updatedAt?: string;
    sentAt?: string;
    deletedAt?: string;
    senderProfile?: UserProfileResponse
    isRead: boolean;

    translations?: string;
    translationsMap?: Record<string, string>;

    senderEphemeralKey?: string;
    usedPreKeyId?: number;
    initializationVector?: string;
    selfContent?: string;
    selfEphemeralKey?: string;
    selfInitializationVector?: string;
    isLocal?: boolean;
    translatedText?: string | null;
    decryptedContent?: string;
    decryptedTranslationsMap?: Record<string, string>;
}
export interface Couple extends BaseEntity {
    id: string;
    user1: User; // Relation Lazy
    user2: User; // Relation Lazy
    status: Enums.CoupleStatus;
    startDate?: string; // LocalDate
    anniversary?: string; // LocalDate
    exploringStart?: string;
    exploringExpiresAt?: string;
    coupleStartDate?: string;
    coupleScore: number;
    sharedAvatarUrl?: string;
    note?: string;
}

export interface Course extends BaseEntity {
    courseId: string;
    title: string;
    latestPublicVersion?: CourseVersion; // OneToOne
    allVersions?: CourseVersion[]; // OneToMany
    difficultyLevel?: Enums.DifficultyLevel;
    type?: Enums.CourseType;
    price: number; // BigDecimal
    languageCode?: string;
    creatorId?: string;
    approvalStatus: Enums.CourseApprovalStatus;
    categoryCode?: string;
}

export interface CourseVersionDiscount extends BaseEntity {
    discountId: string;
    versionId: string;
    discountPercentage: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
}

export interface CourseVersionEnrollment extends BaseEntity {
    enrollmentId: string;
    courseVersion?: CourseVersion;
    status?: Enums.CourseVersionEnrollmentStatus;
    userId: string;
    enrolledAt: string;
    completedAt?: string;
}

export interface CourseLesson extends BaseEntity {
    id: CourseLessonId;
    orderIndex: number;
}

export interface CourseVersionReview extends BaseEntity {
    reviewId: string;
    courseId: string;
    languageCode?: string;
    userId: string;
    rating: number; // BigDecimal
    comment?: string;
    reviewedAt: string;
}

export interface CourseVersion {
    versionId: string;
    course: Course;
    versionNumber: number;
    description?: string;
    thumbnailUrl?: string;
    status: Enums.VersionStatus;
    reasonForChange?: string;
    createdAt: string;
    publishedAt?: string;
    isDeleted: boolean;
    deletedAt?: string;
    lessons?: CourseVersionLesson[];
}

export interface CourseVersionLesson {
    id: CourseVersionLessonId;
    courseVersion?: CourseVersion;
    lesson?: Lesson;
    orderIndex: number;
}

export interface DailyChallenge extends BaseEntity {
    id: string;
    title: string;
    description?: string;
    baseExp: number;
    rewardCoins: number;
    difficulty: Enums.DifficultyLevel;
}

export interface DatingInvite extends BaseEntity {
    inviteId: string;
    senderId: string;
    targetId: string;
    status: Enums.DatingInviteStatus;
    expiresAt: string;
}

export interface Event extends BaseEntity {
    eventId: string;
    eventName: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    eventType: Enums.EventType;
    maxScore: number;
}

export interface Flashcard extends BaseEntity {
    flashcardId: string;
    lessonId: string;
    userId?: string;
    front?: string;
    back?: string;
    exampleSentence?: string;
    imageUrl?: string;
    audioUrl?: string;
    tags?: string;
    nextReviewAt?: string;
    lastReviewedAt?: string;
    intervalDays?: number;
    repetitions?: number;
    easeFactor?: number; // Float
    isSuspended?: boolean;
}

export interface Friendship extends BaseEntity {
    id: FriendshipId;
    status: Enums.FriendshipStatus;
}

export interface GrammarExercise extends BaseEntity {
    exerciseId: string;
    ruleId: string;
    type: string;
    question?: string;
    options?: string[]; // ElementCollection
    correct?: string;
    explanation?: string;
}

export interface GrammarProgress extends BaseEntity {
    id: GrammarProgressId;
    score?: number;
    completedAt?: string;
}

export interface GrammarRule extends BaseEntity {
    ruleId: string;
    topicId: string;
    title: string;
    explanation?: string;
    examples?: string[]; // ElementCollection
}

export interface GrammarTopic extends BaseEntity {
    topicId: string;
    topicName: string;
    languageCode?: string;
    description?: string;
}

export interface GroupAnswer extends BaseEntity {
    groupAnswerId: string;
    groupSessionId?: string;
    lessonQuestionId?: string;
    userId?: string;
    selectedOption?: string;
    isCorrect: boolean;
    answeredAt: string;
}

export interface GroupSession extends BaseEntity {
    groupSessionId: string;
    lessonId?: string;
    roomId?: string;
    userId?: string;
    startedAt: string;
    endedAt?: string;
}

export interface Interest extends BaseEntity {
    interestId: string;
    interestName: string;
    description?: string;
    icon?: string;
    color?: string;
}

export interface InvalidatedToken extends BaseEntity {
    token: string;
    expiryTime: string;
}

export interface Language extends BaseEntity {
    languageCode: string;
    languageName: string;
    description?: string;
}

export interface Leaderboard extends BaseEntity {
    leaderboardId: string;
    period?: string;
    tab?: string;
    snapshotDate?: string;
}

export interface LeaderboardEntry extends BaseEntity {
    leaderboardEntryId: LeaderboardEntryId;
    user?: User;
    leaderboard?: Leaderboard;
    score: number;
}

export interface Lesson extends BaseEntity {
    lessonId: string;
    lessonName: string;
    languageCode?: string;
    title: string;
    expReward: number;
    courseVersions?: CourseVersionLesson[];
    creatorId: string;
    orderIndex?: number;
    description?: string;
    isFree: boolean;
    lessonType?: Enums.LessonType;
    skillTypes?: string; // CSV string
    lessonSeriesId?: string;
    lessonCategoryId?: string;
    lessonSubCategoryId?: string;
    difficultyLevel?: Enums.DifficultyLevel;
    thumbnailUrl?: string;
    durationSeconds?: number;
    certificateCode?: string;
    passScorePercent?: number;
    shuffleQuestions?: boolean;
    allowedRetakeCount?: number;
}

export interface LessonCategory extends BaseEntity {
    lessonCategoryId: string;
    lessonCategoryName: string;
    languageCode?: string;
    description?: string;
    coins?: number;
}

export interface LessonOrderInSeries extends BaseEntity {
    id: LessonOrderInSeriesId;
    orderIndex: number;
}

export interface LessonProgress extends BaseEntity {
    id: LessonProgressId;
    score: number; // float
    completedAt?: string;
    maxScore?: number;
    attemptNumber?: number;
    needsReview?: boolean;
    answersJson?: string;
}

export interface LessonProgressWrongItem extends BaseEntity {
    id: LessonProgressWrongItemsId;
    wrongAnswer?: string;
}

export interface LessonQuestion extends BaseEntity {
    lessonQuestionId: string;
    lessonId: string;
    question?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    questionType?: Enums.QuestionType;
    languageCode?: string;
    optionsJson?: string;
    skillType?: Enums.SkillType;
    mediaUrl?: string;
    weight?: number;
    correctOption?: string;
    orderIndex?: number;
    explainAnswer?: string;
}

export interface LessonReview extends BaseEntity {
    reviewId: string;
    lessonId: string;
    userId: string;
    rating: number; // BigDecimal
    verified: boolean;
    languageCode?: string;
    comment?: string;
    reviewedAt: string;
}

export interface LessonSeries extends BaseEntity {
    lessonSeriesId: string;
    lessonSeriesName: string;
    title: string;
    languageCode?: string;
    description?: string;
}

export interface LessonSubCategory extends BaseEntity {
    lessonSubCategoryId: string;
    lessonSubCategoryName: string;
    languageCode?: string;
    lessonCategoryId?: string;
}

export interface MessageReaction extends BaseEntity {
    reactionId: string;
    chatMessageId: string;
    sentAt: string;
    userId: string;
    reaction: string;
}

export interface MessageTranslation {
    id: string;
    chatMessageId: string;
    targetLang: string;
    translatedText: string;
    provider: string;
    createdAt: string;
}

export interface Notification extends BaseEntity {
    notificationId: string;
    userId: string;
    title: string;
    content?: string;
    type?: Enums.NotificationType;
    languageCode?: string;
    payload?: string;
    read: boolean;
}

export interface Permission extends BaseEntity {
    permissionId: string;
    name: string;
    description?: string;
}

export interface ProficiencyTestConfig {
    testConfigId: string;
    testType: string;
    languageCode: string;
    title: string;
    description?: string;
    numQuestions: number;
    aiTopic?: string;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RefreshToken {
    id: string;
    token: string;
    userId: string;
    isRevoked: boolean;
    expiresAt: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
}

export interface ReviewReaction {
    id: string;
    reviewId: string;
    userId: string;
    reaction?: number; // Short
}

export interface Roadmap extends BaseEntity {
    roadmapId: string;
    languageCode: string;
    title: string;
    description?: string;
    totalItems?: number;
    type?: string;
    items?: RoadmapItem[];
    milestones?: RoadmapMilestone[];
}

export interface RoadmapGuidance extends BaseEntity {
    guidanceId: string;
    itemId: string;
    stage?: string;
    title?: string;
    description?: string;
    orderIndex?: number;
    estimatedTime?: number;
    tips?: string[]; // ElementCollection
}

export interface RoadmapItem extends BaseEntity {
    itemId: string;
    roadmap?: Roadmap;
    title: string;
    description?: string;
    type?: string;
    level?: number;
    estimatedTime?: number;
    orderIndex?: number;
    category?: string;
    difficulty?: string;
    expReward?: number;
    contentId?: string;
    skills?: string[]; // ElementCollection
}

export interface RoadmapMilestone extends BaseEntity {
    milestoneId: string;
    roadmap?: Roadmap;
    title: string;
    description?: string;
    level?: number;
    orderIndex?: number;
    requirements?: string[]; // ElementCollection
    rewards?: string[]; // ElementCollection
}

export interface RoadmapRating {
    ratingId: string;
    user: User;
    roadmap: Roadmap;
    rating: number; // Double
    comment?: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
}

export interface RoadmapResource extends BaseEntity {
    resourceId: string;
    itemId: string;
    type?: string;
    title?: string;
    description?: string;
    url?: string;
    contentId?: string;
    duration?: number;
}

export interface RoadmapSuggestion {
    suggestionId: string;
    user: User;
    roadmap: Roadmap;
    itemId?: string;
    suggestedOrderIndex?: number;
    reason?: string;
    applied: boolean;
    createdAt: string;
    appliedAt?: string;
}

export interface Role extends BaseEntity {
    roleId: string;
    roleName: Enums.RoleName;
    description?: string;
}

export interface RolePermission extends BaseEntity {
    id: RolePermissionId;
}

export interface Room extends BaseEntity {
    roomId: string;
    roomName: string;
    secretKey?: string;
    creatorId?: string;
    maxMembers: number;
    purpose?: Enums.RoomPurpose;
    topic?: Enums.RoomTopic;
    roomType: Enums.RoomType;
    status: Enums.RoomStatus;
    members: UserProfileResponse[];
}

export interface RoomMember extends BaseEntity {
    id: RoomMemberId;
    role?: Enums.RoomRole;
    room?: Room;
    user?: User;
    joinedAt: string;
    endAt?: string;
    isAdmin: boolean;
    nickNameInRom?: string;
}

export interface TestSession {
    testSessionId: string;
    userId: string;
    testConfigId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    score?: number;
    percentage?: number; // Double
    proficiencyEstimate?: string;
    user?: User;
    testConfig?: ProficiencyTestConfig;
}

export interface TestSessionQuestion {
    questionId: string;
    testSessionId: string;
    questionText: string;
    optionsJson?: any; // JSONB
    correctAnswerIndex: number;
    explanation?: string;
    skillType?: string;
    userAnswerIndex?: number;
    isCorrect?: boolean;
    orderIndex: number;
    testSession?: TestSession;
}

export interface Transaction extends BaseEntity {
    transactionId: string;
    userId: string; // Insertable=false, Updatable=false
    user?: User;
    wallet?: Wallet;
    sender?: User;
    receiver?: User;
    originalTransaction?: Transaction;
    amount: number; // BigDecimal
    status: Enums.TransactionStatus;
    type: Enums.TransactionType;
    paymentGatewayTransactionId?: string;
    provider: Enums.TransactionProvider;
    idempotencyKey?: string;
    description?: string;
    currency?: string;
}

export interface User extends BaseEntity {
    userId: string;
    email: string;
    password?: string;
    fullname?: string;
    nickname?: string;
    bio?: string;
    phone?: string;
    avatarUrl?: string;
    coins?: number;
    character3dId?: string;
    nativeLanguageCode?: string;
    country?: Enums.Country;
    ageRange?: Enums.AgeRange;
    proficiency?: Enums.ProficiencyLevel;
    level: number;
    exp: number;
    streak: number;
    lastActiveAt?: string;
    learningPace?: Enums.LearningPace;
}

export interface UserAuthAccount {
    id: string;
    user: User;
    provider: Enums.AuthProvider;
    isPrimary: boolean;
    providerUserId?: string;
    verified: boolean;
    linkedAt: string;
}

export interface UserBadge extends BaseEntity {
    id: UserBadgeId;
    badge?: Badge;
    user?: User;
}

export interface UserCertificate {
    id: UserCertificateId;
    createdAt: string;
}

export interface UserDailyChallenge extends BaseEntity {
    id: UserDailyChallengeId;
    user?: User;
    challenge?: DailyChallenge;
    expReward: number;
    rewardCoins: number;
    progress?: number;
    isCompleted: boolean;
    assignedAt?: string; // Instant
    completedAt?: string; // Instant
}

export interface UserEvent extends BaseEntity {
    id: UserEventId;
    score: number;
    rank?: number;
    participatedAt?: string;
    isCompleted: boolean;
}

export interface UserFcmToken extends BaseEntity {
    userFcmTokenId: string;
    userId?: string;
    fcmToken: string;
    deviceId?: string;
}

export interface UserGoal extends BaseEntity {
    goalId: string;
    userId?: string;
    languageCode?: string;
    certificate?: Enums.Certification;
    targetScore?: number;
    targetSkill?: string;
    customDescription?: string;
    goalType?: Enums.GoalType;
    targetProficiency?: Enums.ProficiencyLevel;
    targetDate?: string;
}

export interface UserInterest extends BaseEntity {
    id: UserInterestId;
    user?: User;
    interest?: Interest;
}

export interface UserLanguage extends BaseEntity {
    id: UserLanguageId;
    proficiencyLevel?: Enums.ProficiencyLevel;
}

export interface UserLearningActivity extends BaseEntity {
    activityId: string;
    userId?: string;
    targetId?: string;
    activityType: Enums.ActivityType;
    durationInSeconds?: number;
    details?: string;
    relatedEntityId?: string;
}

export interface UserMedia {
    id: string;
    userId?: string;
    mediaType?: Enums.MediaType;
    fileName?: string;
    filePath?: string;
    fileUrl?: string;
    createdAt?: string;
}

export interface UserMemorization extends BaseEntity {
    memorizationId: string;
    userId: string;
    contentType: Enums.ContentType;
    contentId?: string;
    noteText?: string;
    isFavorite: boolean;
}

export interface UserReminder {
    id: string;
    userId: string;
    targetType: Enums.TargetType;
    targetId?: string;
    title?: string;
    message?: string;
    reminderTime: string;
    reminderDate?: string;
    repeatType?: Enums.RepeatType;
    enabled?: boolean;
    isDeleted: boolean;
    createdAt: string;
}

export interface UserRoadmap extends BaseEntity {
    userRoadmapId: UserRoadmapId;
    roadmap?: Roadmap;
    user?: User;
    currentLevel?: number;
    targetLevel?: number;
    targetProficiency?: string;
    estimatedCompletionTime?: number;
    completedItems?: number;
    status?: string;
    isPublic: boolean;
    language?: string;
}

export interface UserRole extends BaseEntity {
    id: UserRoleId;
    user?: User;
    role?: Role;
}

export interface UserSeriesProgress extends BaseEntity {
    id: UserSeriesProgressId;
    currentIndex: number;
    startedAt: string;
    completedAt?: string;
}

export interface Video extends BaseEntity {
    videoId: string;
    title?: string;
    videoUrl?: string;
    type?: Enums.VideoType;
    originalSubtitleUrl?: string;
    lessonId?: string;
    language?: string;
    averageRating: number; // double
    totalViews: number;
    level?: Enums.DifficultyLevel;
}

export interface VideoCall extends BaseEntity {
    videoCallId: string;
    roomId?: string;
    callerId?: string;
    calleeId?: string;
    videoCallType?: Enums.VideoCallType;
    status: Enums.VideoCallStatus;
    startTime?: string;
    endTime?: string;
    duration?: string;
    qualityMetrics?: string; // jsonb
}

export interface VideoCallParticipant extends BaseEntity {
    id: VideoCallParticipantId;
    user?: User;
    videoCall?: VideoCall;
    joinedAt?: string;
    leftAt?: string;
    role?: Enums.VideoCallRole;
    status?: Enums.VideoCallParticipantStatus;
}

export interface VideoReaction {
    id: string;
    videoId?: string;
    userId?: string;
    reaction?: number; // Short
}

export interface VideoReview extends BaseEntity {
    reviewId: string;
    videoId?: string;
    userId?: string;
    rating?: number;
    content?: string;
    likeCount?: number;
    dislikeCount?: number;
}

export interface VideoSubtitle extends BaseEntity {
    videoSubtitleId: string;
    videoId?: string;
    languageCode?: string;
    subtitleUrl?: string;
}

export interface Wallet extends BaseEntity {
    walletId: string;
    user: User;
    balance: number; // BigDecimal
}