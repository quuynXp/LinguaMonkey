import { Language } from './entity';
// src/types/dto.ts
import * as Enums from './enums';
import * as Entities from './entity';
import { QuestionType, SkillType } from './enums';

// --- Generic DTOs ---
export interface AppApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

export interface RefundRequestResponse {
    refundTransactionId: string;
    originalTransactionId: string;
    requesterName: string;
    requesterEmail: string;
    courseName: string;
    amount: number;
    reason: string;
    status: "PENDING" | "SUCCESS" | "REJECTED";
    requestDate: string;
}

export interface ApproveRefundRequest {
    refundTransactionId: string;
}
export interface LessonHierarchicalResponse {
    categoryId: string;
    categoryName: string;
    coinReward: number;
    subCategories: SubCategoryDto[];
}

export interface SubCategoryDto {
    subCategoryId: string;
    subCategoryName: string;
    lessons: LessonResponse[];
}


export interface PageResponse<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isLast: boolean;
    isFirst: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
}

// --- Request DTOs ---

export interface AddSuggestionRequest {
    userId: string;
    itemId: string;
    suggestedOrderIndex: number;
    reason: string;
}

// export interface ApproveRefundRequest {
//     transactionId: string;
//     adminId: string;
//     approved: boolean;
//     adminComment: string;
// }

export interface AssignRoadmapRequest {
    userId: string;
    roadmapId: string;
}

export interface AuthenticationRequest {
    email?: string;
    password?: string;
}

export interface BadgeRequest {
    badgeName: string;
    description: string;
    imageUrl: string;
    criteriaType: Enums.CriteriaType;
    criteriaThreshold: number;
}

export interface StreamingChunk {
    type: "metadata" | "chunk" | "suggestion" | "final" | "error";
    feedback: string; // Message hiển thị
    score?: number; // Điểm số (chỉ có ở type 'final' hoặc 'chunk')

    // Dữ liệu phân tích từng từ (cho type 'chunk')
    word_analysis?: {
        word: string;
        spoken: string;
        word_score: number;
        is_correct: boolean;
    };

    // Metadata tổng hợp (cho type 'final')
    metadata?: {
        accuracy_score: number;
        fluency_score: number;
        error_count: number;
    };
}

export interface WordFeedback {
    word: string;
    spoken: string;
    score: number;
    isCorrect: boolean;
    suggestion?: string;
}

export interface FinalResult {
    overall_score: number;
    accuracy_score: number;
    fluency_score: number;
    error_count: number;
    feedback: string;
}

export interface SpeakingSentence {
    id: string;
    text: string;
    phonetic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    categoryId: string;
    audioUrl?: string;
}

export interface SpeakingCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface BasicLessonRequest {
    languageCode: string;
    lessonType: string; // Enum string?
    symbol: string;
    romanization: string;
    meaning: string;
    pronunciationAudioUrl: string;
    videoUrl: string;
    imageUrl: string;
    exampleSentence: string;
    exampleTranslation: string;
}

export interface CallPreferencesRequest {
    interests?: string[];
    gender?: string;
    nativeLanguage?: string; // Singular
    learningLanguages?: string[]; // FIX: Đã đổi tên/thêm trường List
    ageRange?: string;
    proficiency?: Enums.ProficiencyLevel; // FIX: Thêm trường
    learningPace?: Enums.LearningPace; // FIX: Thêm trường
    callDuration?: string; // Giữ lại string theo DTO gốc
    userId: string;
}
export interface CertificateRequest {
    name: string;
    description: string;
    languageCode: string;
    criteriaJson: string;
}

export interface Character3dRequest {
    character3dName: string;
    description: string;
    modelUrl: string;
}

export interface ChatMessageRequest {
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    mediaUrl: string;
    messageType: Enums.MessageType;
    purpose: Enums.RoomPurpose;
    isRead: boolean;
}

export interface CoupleRequest {
    user1Id: string;
    user2Id: string;
    status: Enums.CoupleStatus;
    startDate: string;
}

export interface CourseVersionDiscountRequest {
    versionId: string; // Changed from courseId
    discountPercentage: number;
    startDate?: string;
    endDate?: string;
    code: string;
    isActive?: boolean;
    isDeleted?: boolean;
}

export interface CourseVersionEnrollmentRequest {
    courseId?: string;
    courseVersionId: string; // Required
    userId: string;
    status?: string; // Enum CourseEnrollmentStatus
    paymentStatus?: string; // Enum PaymentStatus
}

export interface CourseLessonRequest {
    courseId?: string;
    versionId: string; // Required
    lessonId: string;
    orderIndex: number;
}

export interface CourseLessonUploadRequest {
    courseId: string;
    versionId: string;
    lessonIndex: number;
    videoFile?: any; // MultipartFile
    thumbnailFile?: any; // MultipartFile
    resourceUrls: string[];
}

export interface CourseRequest {
    title: string;
    creatorId: string;
    price: number;
    languageCode: string;
    difficultyLevel: Enums.DifficultyLevel;
    type: Enums.CourseType;
    description: string;
    thumbnailUrl: string;
    categoryCode?: string;
}

export interface CourseVersionReviewRequest {
    courseId: string;
    versionId?: string; // Added
    userId: string;
    rating: number;
    comment: string;
    parentId?: string;
}

export interface CreateCourseRequest {
    creatorId: string;
    title: string;
    price: number;
    categoryCode?: string;
}

export interface UserReminderResponse {
    id: string;
    title?: string;
    message?: string;
    reminderTime: string; // "HH:mm" or ISO
    reminderDate?: string; // "YYYY-MM-DD"
    repeatType: Enums.RepeatType; // DAILY, WEEKLY...
    enabled: boolean;
    targetType: Enums.TargetType;
    targetId?: string;
}

export interface UserReminderRequest {
    title?: string;
    message?: string;
    reminderDate?: string;
    repeatType?: Enums.RepeatType;
    targetType: Enums.TargetType;
    targetId?: string;
    enabled?: boolean;
    time?: string;
    date?: string;
}

export interface CreateFlashcardRequest {
    lessonId: string;
    // userId: string;
    front: string;
    back: string;
    exampleSentence: string;
    imageUrl: string;
    audioUrl: string;
    tags: string;
    isPublic: boolean;
}

export interface CreateGroupCallRequest {
    roomId?: string;
    callerId: string;
    participantIds: string[];
    videoCallType: Enums.VideoCallType
}

export interface CreateReviewRequest {
    userId: string;
    rating: number;
    content: string;
}

export interface CreateRoadmapRequest {
    title: string;
    description: string;
    languageCode: string;
    currentLevel: number;
    targetLevel: number;
    targetProficiency: Enums.ProficiencyLevel;
    estimatedCompletionTime: number;
    items: RoadmapItemRequest[];
    certification: Enums.Certification;
}

export interface RoadmapItemRequest {
    title: string;
    description: string;
    estimatedTime: number;
    orderIndex: number;
    resources: ResourceRequest[];
}

export interface ResourceRequest {
    title: string;
    url: string;
    type: string;
    description: string;
    duration: number;
}

export interface CustomTestRequest {
    userId: string;
    answers: AnswerDTO[];
}

export interface DepositRequest {
    userId: string;
    amount: number;
    provider: Enums.TransactionProvider;
    currency: string;
    returnUrl: string;
}

export interface EmailRequest {
    to: string;
    subject: string;
    templateCode: string;
    params: Record<string, string>;
    language: string;
}

export interface EventRequest {
    eventId: string;
    eventName: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    eventType: Enums.EventType;
    maxScore: number;
}

export interface FriendRequestRequest {
    requesterId: string;
    receiverId: string;
    status: string;
    isDeleted: boolean;
}

export interface FriendshipRequest {
    requesterId: string;
    receiverId: string;
    status: Enums.FriendshipStatus;
}

export interface GenerateRoadmapRequest {
    userId: string;
    languageCode: string;
    targetProficiency: string;
    targetDate: string;
    focusAreas: string[];
    studyTimePerDay: number;
    isCustom: boolean;
    additionalPrompt: string;
}

export interface GroupAnswerRequest {
    groupSessionId: string;
    lessonQuestionId: string;
    userId: string;
    selectedOption: string;
    isCorrect: boolean;
    answeredAt: string;
    isDeleted: boolean;
}

export interface GroupSessionRequest {
    lessonId: string;
    roomId: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    isDeleted: boolean;
}

export interface InterestRequest {
    interestName: string;
    description: string;
    icon: string;
    color: string;
}

export interface IntrospectRequest {
    token: string;
}

export interface LanguageRequest {
    languageCode: string;
    languageName: string;
    description: string;
}

export interface LeaderboardEntryRequest {
    leaderboardId: string;
    userId: string;
    rank: number;
    score: number;
    level: number;
    streak: number;
    change: number;
    isDeleted: boolean;
}

export interface LeaderboardRequest {
    period: string;
    tab: string;
    snapshotDate: string;
}


export interface LessonCategoryRequest {
    lessonCategoryName: string;
    languageCode: string;
    description: string;
}

export interface LessonOrderInSeriesRequest {
    lessonId: string;
    lessonSeriesId: string;
    orderIndex: number;
    isDeleted: boolean;
}

export interface LessonProgressRequest {
    lessonId: string;
    userId: string;
    score: number;
    completedAt: string;
    maxScore: number;
    attemptNumber: number;
    needsReview: boolean;
    answersJson: string;
}

export interface LessonProgressWrongItemRequest {
    lessonId: string;
    userId: string;
    lessonQuestionId: string;
    wrongAnswer: string;
}

export interface LessonQuestionRequest {
    lessonId: string;
    question: string;
    questionType: QuestionType;
    skillType: SkillType;
    languageCode: string;
    optionsJson?: string; // JSON stringify of {A, B, C, D}
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;

    correctOption: string;

    // New Fields
    transcript?: string;
    mediaUrl?: string;
    explainAnswer?: string;

    weight: number;
    orderIndex: number;
    isDeleted?: boolean;
}

export interface LessonRequest {
    lessonName: string;
    languageCode: string;
    title: string;
    expReward: number;
    creatorId: string;
    orderIndex: number;
    courseId: string;
    versionId: string;
    description?: string;
    isFree?: boolean;
    lessonType?: Enums.LessonType;
    skillType?: string;
    transcript?: string;
    lessonSeriesId?: string;
    lessonCategoryId?: string;
    mediaUrls?: string[];
    lessonSubCategoryId?: string;
    difficultyLevel?: Enums.DifficultyLevel;
    thumbnailUrl?: string;
    durationSeconds?: number;
    certificateCode?: string;
    passScorePercent?: number;
    shuffleQuestions?: boolean;
    allowedRetakeCount?: number;
    questions?: LessonQuestionRequest[];
}

export interface LessonReviewRequest {
    lessonId: string;
    userId: string;
    rating: number;
    comment: string;
    verified: boolean;
}

export interface LessonSeriesRequest {
    lessonSeriesName: string;
    title: string;
    languageCode: string;
    description: string;
}

export interface LessonSubCategoryRequest {
    lessonSubCategoryName: string;
    lessonCategoryId: string;
    languageCode: string;
}

export interface MemorizationRequest {
    userId: string;
    contentType: Enums.ContentType;
    contentId: string;
    noteText: string;
    favorite: boolean;
}

export interface MessageReactionRequest {
    reactionId: string;
    chatMessageId: string;
    sentAt: string;
    userId: string;
    reaction: string;
    isDeleted: boolean;
}

export interface MoveRequest {
    fromPublicId: string;
    toPublicId: string;
    overwrite: boolean;
    resourceType: string;
}

export interface NotificationRequest {
    userId: string;
    title: string;
    content: string;
    type: Enums.NotificationType;
    languageCode: string;
    payload: string;
    fcmToken?: string;
    deviceId?: string;
}

export interface OtpRequest {
    emailOrPhone: string;
}

export interface PaymentRequest {
    userId: string;
    amount: number;
    provider: Enums.TransactionProvider;
    returnUrl: string;
    currency: string;
    type: Enums.TransactionType
    description: string;
}

export interface PermissionRequest {
    permissionId: string;
    name: string;
    description?: string;
}

export interface PublishVersionRequest {
    reasonForChange: string;
}

export interface QuestionAnswerRequest {
    lessonQuestionId: string;
    userId: string;
    selectedOption: string;
    isCorrect: boolean;
    isDeleted: boolean;
}

export interface RefundRequest {
    originalTransactionId: string;
    requesterId: string;
    reason: string;
    watchTimePercentage: number;
}

export interface RoleRequest {
    name: string;
}

export interface RoomMemberRequest {
    roomId: string;
    userId: string;
    role: string;
    isDeleted: boolean;
}

export interface RoomRequest {
    roomName: string;
    creatorId: string;
    description: string;
    password: string;
    roomCode: string;
    maxMembers: number;
    purpose: Enums.RoomPurpose;
    roomType: Enums.RoomType;
    isDeleted: boolean;
    memberIds?: string[];
}

export interface SocialLoginRequest {
    idToken: string;
    accessToken: string;
}

export interface SpellingRequestBody {
    text: string;
    language: string;
}

export interface StartCompleteRoadmapItemRequest {
    userId: string;
    itemId: string;
    score: number;
}

export interface SubmitExerciseRequest {
    ruleId: string;
    userId: string;
    answers: Record<string, string>;
}

export interface SwitchVersionRequest {
    enrollmentId: string;
    newVersionId: string;
}

export interface TeacherApplyRequest {
    userId: string;
    idDocumentUrl: string;
    certificateUrls: string[];
    fullName: string;
    dateOfBirth: string; // LocalDate
    phoneNumber: string;
    shortBio: string;
    teachingLanguages: string[];
    subjects: string[];
    sampleLessonUrls: string[];
    yearsOfExperience: number;
    suggestedPricePerCourse: number;
    linkedinUrl: string;
    portfolioUrl: string;
    additionalNotes: string;
    submissionSource: string;
}

export interface TestSubmissionRequest {
    answers: Record<string, number>; // UUID -> Integer
}

export interface TransactionRequest {
    userId: string;
    amount: number;
    coins: number;
    currency: string;
    receiverId?: string;
    provider: Enums.TransactionProvider;
    type: Enums.TransactionType;
    description: string;
    status: Enums.TransactionStatus;
    courseVersionId?: string;
}

export interface TransferRequest {
    senderId: string;
    receiverId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
}

export interface TranslationRequestBody {
    text: string;
    source_lang: string;
    target_lang: string;
}

export interface TtsRequest {
    text: string;
    language: string;
}

export interface TypingStatusRequest {
    userId: string;
    isTyping: boolean;
}

export interface UpdateCourseDetailsRequest {
    title: string;
    // price: number;
    // languageCode: string;
    // difficultyLevel: Enums.DifficultyLevel;
    // categoryCode?: string;
}

export interface UpdateCourseVersionRequest {
    description: string;
    thumbnailUrl: string;
    lessonIds: string[];

    price?: number;
    languageCode?: string;
    difficultyLevel?: Enums.DifficultyLevel;
    categoryCode?: string;
}

export interface UpdateGrammarProgressRequest {
    topicId: string;
    ruleId: string;
    userId: string;
    score: number;
}

export interface UpdateParticipantStatusRequest {
    status: Enums.VideoCallParticipantStatus;
}

export interface UserBadgeRequest {
    userId: string;
    badgeId: string;
    earnedAt: string;
    isDeleted: boolean;
}

export interface UserCharacterRequest {
    userId: string;
    character3dId: string;
    isDeleted: boolean;
}

export interface UserGoalRequest {
    userId: string;
    languageCode: string;
    examName: string;
    targetScore: number;
    targetSkill: string;
    customDescription: string;
    goalType: Enums.GoalType;
    targetProficiency: Enums.ProficiencyLevel;
    targetDate: string;
}

export interface UserLanguageRequest {
    userId: string;
    languageId: string;
    proficiencyLevel: string;
    isDeleted: boolean;
}


export interface UserRequest {
    // fullname?: string;
    email?: string;
    password?: string;
    fullname?: string;
    nickname?: string;
    bio?: string;
    phone?: string;
    avatarUrl?: string;
    character3dId?: string;
    dayOfBirth?: string;
    badgeId?: string;
    ageRange?: Enums.AgeRange;
    learningPace?: Enums.LearningPace;
    interestIds?: string[];
    goalIds?: string[];
    certificationIds?: string[];
    nativeLanguageCode?: string;
    proficiency?: Enums.ProficiencyLevel;
    languages?: string[];
    country?: Enums.Country;
    level: number;
    authProvider?: string;
    score: number;
    streak: number;
    gender?: string;
}

export interface UserRoleRequest {
    roleId: string;
    userId: string;
    isDeleted: boolean;
}

export interface UserSeriesProgressRequest {
    seriesId: string;
    userId: string;
    currentIndex: number;
    isDeleted: boolean;
}

export interface UserSettingRequest {
    userId: string;
    notificationPreferences?: string; // Legacy or map manually
    studyReminders?: boolean;
    streakReminders?: boolean;
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    profileVisibility?: boolean;
    progressSharing?: boolean;
    searchPrivacy?: boolean; // Added
    theme?: string;
    language?: string;
    isDeleted?: boolean;
}
export interface UserSettings {
    userId: string;
    notificationPreferences?: string; // Legacy or map manually
    studyReminders?: boolean;
    streakReminders?: boolean;
    autoTranslate?: boolean;
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    profileVisibility?: boolean;
    progressSharing?: boolean;
    searchPrivacy?: boolean; // Added
    theme?: string;
    language?: string;
    isDeleted?: boolean;
}

export interface VerifyOtpRequest {
    emailOrPhone: string;
    code: string;
}

export interface VideoCallParticipantRequest {
    videoCallId: string;
    userId: string;
}

export interface VideoCallRequest {
    callerId: string;
    status: Enums.VideoCallStatus
}

export interface VideoProgressRequest {
    userId: string;
    currentTime: number;
    duration: number;
}

export interface VideoRequest {
    videoUrl: string;
    title: string;
    type: string; // VideoType via mapper
    level: Enums.DifficultyLevel;
    originalSubtitleUrl: string;
    lessonId: string;
}

export interface VideoSubtitleRequest {
    languageCode: string;
    subtitleUrl: string;
}

export interface WebhookRequest {
    provider: string;
    payload: Record<string, string>;
}

export interface WithdrawRequest {
    userId: string;
    amount: number;
    provider: Enums.TransactionProvider;
    bankCode: string;
    accountNumber: string;
    accountName: string;
}

// --- Response DTOs ---

export interface ActivityCountResponse {
    activityType: string;
    period: string;
    count: number;
}

export interface AuthenticationResponse {
    token: string;
    refreshToken: string;
    authenticated: boolean;
}

export interface BadgeProgressResponse {
    badgeId: string;
    badgeName: string;
    description: string;
    imageUrl: string;
    criteriaType: Enums.CriteriaType;
    criteriaThreshold: number;
    currentUserProgress: number;
    isAchieved: boolean;
}

export interface BadgeResponse {
    badgeId: string;
    badgeName: string;
    description: string;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    deletedAt: string;
}

export interface BasicLessonResponse {
    id: string;
    languageCode: string;
    lessonType: string;
    symbol: string;
    romanization: string;
    meaning: string;
    pronunciationAudioUrl: string;
    data: string;
    videoUrl: string;
    imageUrl: string;
    exampleSentence: string;
    exampleTranslation: string;
}

export interface BilingualVideoResponse {
    videoId: string;
    title: string;
    category: string;
    level: Enums.DifficultyLevel;
    url: string;
    createdAt: string;
}

export interface CertificateResponse {
    certificateId: string;
    certificateName: string;
    languageCode: string;
    description: string;
}

export interface Character3dResponse {
    character3dId: string;
    character3dName: string;
    description: string;
    modelUrl: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
}

export interface ChatMessageResponse {
    chatMessageId: string;
    roomId: string;
    senderId: string;
    receiverId: string;
    content: string;
    mediaUrl: string;
    messageType: Enums.MessageType;
    translatedText: string;
    translatedLang: string;
    purpose: Enums.RoomPurpose;
    isRead: boolean;
    isDeleted: boolean;
    senderProfile: UserProfileResponse;
    sentAt: string;
    updatedAt: string;
    deletedAt: string;
}

export interface ChatStatsResponse {
    totalMessages: number;
    translationsUsed: number;
    videoCalls: number;
    joinedRooms: number;
    lastActiveAt: string;
    online: boolean;
    level: number;
    exp: number;
    streak: number;
}

export interface CoupleResponse {
    id: string;
    user1Id: string;
    user2Id: string;
    status: string;
    startDate: string; // date
    anniversary: string; // date
    sharedAvatarUrl: string;
    note: string;
    user1?: UserResponse;
    user2?: UserResponse;
}

export interface CourseVersionDiscountResponse {
    discountId: string;
    versionId: string; // Changed from courseId
    discountPercentage: number;
    startDate: string;
    endDate: string;
    code: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CourseVersionEnrollmentResponse {
    enrollmentId: string;
    userId: string;
    enrolledAt: string;
    course: CourseResponse;        // The abstract course info
    courseVersion: CourseVersionResponse; // The specific version enrolled
    progress: number;
    completedLessonsCount: number;
}
export interface CourseLessonResponse {
    courseId: string;
    lessonId: string;
    orderIndex: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    title?: string;
    duration?: string;
    LessonSummaryResponse?: LessonSummaryResponse[];
}

export interface CoursePerformanceResponse {
    courseId: string;
    title: string;
    lessonsCount: number;
    studentsCount: number;
    revenue: number;
    transactions: number;
    timeSeries: TimeSeriesPoint[];
}

export interface CourseResponse {
    activeDiscountPercentage: number;
    discountedPrice: number;
    courseId: string;
    title: string;
    creatorId: string;
    roomId: string;
    approvalStatus: Enums.CourseApprovalStatus;
    createdAt: string;
    updatedAt: string;
    latestPublicVersion: CourseVersionResponse;
    latestDraftVersion: CourseVersionResponse;

    creatorNickname?: string;
    creatorCountry?: Enums.Country;
    creatorVip?: boolean;
    totalStudents?: number;
    isAdminCreated?: boolean;
    creatorLevel?: number;
    creatorName?: string;
    creatorAvatar?: string;

    // Rating enriched info
    averageRating?: number;
    reviewCount?: number;
}

export interface CourseVersionReviewResponse {
    reviewId: string;
    courseId: string;
    userId: string;
    rating: number;
    ersionId?: string;
    comment: string;
    likeCount: number;
    dislikeCount: number;
    topReplies: CourseVersionReviewResponse[] | null;
    replyCount: number;
    userFullname: string;
    userNickname: string;
    isLiked: boolean;
    isDisliked: boolean;
    userAvatar: string;
    isDeleted: boolean;
    reviewedAt: string;
}

export interface CourseSummaryResponse {
    courseId: string;
    title: string;
    ownerId: string;
    level: Enums.DifficultyLevel;
    ownerName: string;
    thumbnailUrl: string;
    averageRating: number;
    reviewCount: number;
    star: number;
}

export interface CourseVersionResponse {
    versionId: string;
    courseId: string;
    versionNumber: number;

    // Thêm các trường từ Course entity gốc
    title: string;
    difficultyLevel: Enums.DifficultyLevel;
    type: Enums.CourseType;
    categoryCode?: string;
    price: number;
    languageCode: string;

    description: string;
    thumbnailUrl: string;
    status: Enums.VersionStatus;
    reasonForChange: string;
    createdAt: string;
    publishedAt: string;
    isDeleted: boolean;
    deletedAt: string;
    lessons: LessonSummaryResponse[];

    isIntegrityValid?: boolean;
    isContentValid?: boolean;
    isSystemReviewed?: boolean;
    validationWarnings?: string;
    systemRating?: number;
}

export interface DashboardStatisticsResponse {
    totalRevenue: number;
    activeUsers: number;
    totalCourses: number;
    newSignups: number;
    revenueChange: number;
    usersChange: number;
    coursesChange: number;
    signupsChange: number;
    chartData: TimeSeriesPoint[];
}

export interface DatingInviteSummary {
    inviteId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    status: Enums.DatingInviteStatus;
    sentAt: string;
    expiresAt?: string;
    viewerIsSender: boolean;
    secondsToExpire: number;
}

export interface EventResponse {
    eventId: string;
    eventName: string;
    description: string;
    startDate: string;
    endDate: string;
    eventType: Enums.EventType;
    maxScore: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FacebookUserResponse {
    id: string;
    name: string;
    email: string;
    picture: any; // Map<String, Object>
}

export interface FlashcardResponse {
    flashcardId: string;
    lessonId: string;
    userId: string;
    front: string;
    back: string;
    exampleSentence: string;
    imageUrl: string;
    audioUrl: string;
    authorProfile: UserProfileResponse;
    createdAt: string;
    claimCount: number;
    tags: string;
    nextReviewAt: string;
    lastReviewedAt: string;
    intervalDays: number;
    repetitions: number;
    easeFactor: number;
    isSuspended: boolean;
    isDeleted: boolean;
    isPublic: boolean;
}

export interface FriendRequestResponse {
    userId: string;
    fullName: string;
    avatarUrl: string;
    requestedAt: string;
    mutualFriends: number;
}

export interface FriendRequestStatusResponse {
    hasSentRequest: boolean;
    hasReceivedRequest: boolean;
    status: string;
}

export interface FriendshipResponse {
    requesterId: string;
    receiverId: string;
    status: Enums.FriendshipStatus;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    id: string;
    requester?: UserResponse;
    receiver?: UserResponse;
}

export interface GrammarExerciseResponse {
    exerciseId: string;
    ruleId: string;
    type: string;
    question: string;
    options: string[];
    correct: string;
    explanation: string;
    createdAt: string;
    updatedAt: string;
}

export interface GrammarRuleResponse {
    ruleId: string;
    topicId: string;
    title: string;
    explanation: string;
    examples: string[];
    createdAt: string;
    updatedAt: string;
    exercises: GrammarExerciseResponse[];
    userScore: number;
    completedAt: string;
}

export interface GrammarTopicResponse {
    topicId: string;
    topicName: string;
    languageCode: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    rules: GrammarRuleResponse[];
    isDeleted: boolean;
    deletedAt?: string;
}

export interface GroupAnswerResponse {
    groupAnswerId: string;
    groupSessionId: string;
    lessonQuestionId: string;
    userId: string;
    selectedOption: string;
    isCorrect: boolean;
    isDeleted: boolean;
    answeredAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface GroupSessionResponse {
    groupSessionId: string;
    lessonId: string;
    roomId: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface InterestResponse {
    interestId: string;
    interestName: string;
    description: string;
    icon: string;
    color: string;
}

export interface IntrospectResponse {
    active: boolean;
    scope: string;
    userid: string;
    exp: number;
    valid: boolean; // Added from AuthenticationServiceImpl
}

export interface LanguageResponse {
    languageCode: string;
    languageName: string;
    description: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LeaderboardEntryResponse {
    leaderboardEntryId: Entities.LeaderboardEntryId,
    userId: string;
    fullname: string;
    nickname: string;
    avatarUrl: string;
    gender?: string;
    level: number;
    exp: number;
    rank?: number;
    score?: number;
    streak?: number;
    change?: number;
}

export interface LeaderboardResponse {
    leaderboardId: string;
    period: string;
    tab: string;
    snapshotDate: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    entries: LeaderboardEntryResponse[];
}

export interface LessonCategoryResponse {
    lessonCategoryId: string;
    lessonCategoryName: string;
    description: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonOrderInSeriesResponse {
    lessonId: string;
    lessonSeriesId: string;
    orderIndex: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonProgressResponse {
    lessonId: string;
    userId: string;
    score: number;
    attemptNumber: number;
    completedAt: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonProgressWrongItemResponse {
    lessonId: string;
    userId: string;
    lessonQuestionId: string;
    wrongAnswer: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonQuestionResponse {
    lessonQuestionId: string;
    lessonId: string;
    question: string;
    questionType: QuestionType;
    skillType: SkillType;
    languageCode: string;
    optionsJson?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctOption: string;
    transcript?: string;
    mediaUrl?: string;
    explainAnswer?: string;
    weight: number;
    orderIndex: number;
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
    lessonType: Enums.LessonType;
    skillTypes: Enums.SkillType;
    flashcardCount: number;
    dueFlashcardsCount: number;
    videoUrls: string[];
    questions?: LessonQuestionResponse[];
    description: string;
    orderIndex: number;
    isFree: boolean;
    difficultyLevel: Enums.DifficultyLevel;
    thumbnailUrl: string;
    durationSeconds: number;
    certificateCode: string;
    passScorePercent: number;
    shuffleQuestions: boolean;
    updatedAt?: string;
    allowedRetakeCount: number;
}

export interface CreatorDashboardResponse {
    totalStudents: number;
    totalReviews: number;
    averageRating: number;
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    revenueYear: number;
    revenueChart: ChartDataPoint[];
}

export interface LessonReviewResponse {
    reviewId: string;
    lessonId: string;
    userId: string;
    rating: number;
    comment: string;
    reviewedAt: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonSeriesResponse {
    lessonSeriesId: string;
    lessonSeriesName: string;
    title: string;
    description: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonStatsResponse {
    lessonId: string;
    lessonName: string;
    expReward: number;
    completions: number;
}

export interface LessonSubCategoryResponse {
    lessonSubCategoryId: string;
    lessonSubCategoryName: string;
    lessonCategoryId: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonSummaryResponse {
    lessonId: string;
    title: string;
    orderIndex: number;
    isFree: boolean;
}

export interface LevelInfoResponse {
    currentLevel: number;
    currentExp: number;
    nextLevelExp: number;
}

export interface ListeningResponse {
    transcription: string;
    questions: ComprehensionQuestion[];
}

export interface MemberResponse {
    userId: string;
    fullname: string;
    nickname: string;
    avatarUrl: string;
    isAdmin: boolean;
    nickNameInRoom: string;
    role: string;
    isOnline: boolean;
}

export interface MemorizationResponse {
    memorizationId: string;
    userId: string;
    contentType: Enums.ContentType;
    contentId: string;
    noteText: string;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MemorySummaryResponse {
    eventId: string;
    eventType: string;
    title: string;
    description: string;
    joinedAt: string;
    thumbnailUrl: string;
    date: string;
}

export interface MessageReactionResponse {
    reactionId: string;
    chatMessageId: string;
    sentAt: string;
    userId: string;
    reaction: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MindMapNode {
    id: string;
    title: string;
    description: string;
    x: number;
    y: number;
    color: string;
    level: number;
    children: string[];
    examples: string[];
    rules: string[];
    type: string;
}

export interface NotificationResponse {
    notificationId: string;
    userId: string;
    title: string;
    content: string;
    type: string;
    payload: string;
    read: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CoupleProfileSummary {
    coupleId: string;
    partnerId: string;
    partnerFullname: string;
    partnerAvatarUrl: string;
    daysTogether: number;
    status: Enums.CoupleStatus;
    coupleScore: number;
    coupleLeaderboardRank: number;
    coupleBadges: BadgeResponse[];
}

export interface PermissionResponse {
    permissionId: string;
    name: string;
    description?: string;
}

export interface PronunciationResponseBody {
    feedback: string;
    score: number;
}

export interface QuestionAnswerResponse {
    questionAnswerId: string;
    lessonQuestionId: string;
    userId: string;
    selectedOption: string;
    isCorrect: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface QuizResponse {
    quizId: string;
    questions: QuizQuestionDto[];
}

export interface ReadingResponse {
    passage: string;
    questions: ComprehensionQuestion[];
}

export interface RegisterResponse {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
}

export interface ResourceResponse {
    type: string;
    url: string;
    description: string;
    title: string;
    duration: number;
}

export interface RoadmapGuidanceResponse {
    guidanceId: string;
    stage: string;
    title: string;
    description: string;
    tips: string[];
    estimatedTime: number;
    orderIndex: number;
}

export interface RoadmapItemDetailResponse {
    itemId: string;
    title: string;
    description: string;
    type: string;
    level: number;
    estimatedTime: number;
    expReward: number;
    difficulty: string;
    category: string;
    contentId: string;
    skills: string[];
    resources: ResourceResponse[];
    guidances: RoadmapGuidanceResponse[];
}

export interface RoadmapItemResponse {
    id: string;
    name: string;
    description: string;
    type: string;
    level: number;
    estimatedTime: number;
    expReward: number;
    difficulty: string;
    category: string;
    resources: ResourceResponse[];
}

export interface RoadmapItemUserResponse {
    id: string;
    name: string;
    completed: boolean;
    progress: number;
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    completedAt?: string;
    startedAt?: string;
}

export interface RoadmapMilestoneDetailResponse {
    milestoneId: string;
    title: string;
    description: string;
    level: number;
    requirements: string[];
    rewards: string[];
    orderIndex: number;
    status: string;
    progressPercentage: number;
}

export interface RoadmapPublicDetailResponse {
    roadmapId: string;
    title: string;
    description: string;
    language: string;
    creator: string;
    creatorId: string;
    creatorAvatar: string;
    totalItems: number;
    items: RoadmapItemResponse[];
    milestones: MilestoneResponse[];
    averageRating: number;
    viewCount: number;
    favoriteCount: number;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    suggestions: RoadmapSuggestionResponse[];
}

export interface RoadmapPublicResponse {
    roadmapId: string;
    title: string;
    description: string;
    language: string;
    creator: string;
    creatorId?: string;
    creatorAvatar?: string;
    totalItems: number;
    suggestionCount: number;
    difficulty?: string;
    type?: string;
    createdAt: string;
    updatedAt: string;
    viewCount: number;

    favoriteCount: number;
    isFavorite: boolean;
    isOfficial?: boolean;
}

export interface RoadmapResponse {
    id: string;
    title: string;
    description: string;
    language: string;
    items: RoadmapItemResponse[];
    milestones: MilestoneResponse[];
    resources: ResourceResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface RoadmapSuggestionDetailResponse {
    suggestionId: string;
    userId: string;
    // fullname: string;
    userAvatar: string;
    userLevel: number;
    roadmapId: string;
    roadmapTitle: string;
    itemId: string;
    itemTitle: string;
    suggestedOrderIndex: number;
    reason: string;
    likeCount: number;
    viewCount: number;
    applied: boolean;
    userLiked: boolean;
    createdAt: string;
    appliedAt: string;
    status: string;
}

export interface RoadmapSuggestionResponse {
    suggestionId: string;
    userId: string;
    fullname: string;
    userAvatar: string;
    roadmapId: string;
    itemId: string;
    suggestedOrderIndex: number;
    reason: string;
    appliedCount: number;
    likeCount: number;
    applied: boolean;
    userLiked: boolean;
    createdAt: string;
    appliedAt: string;
}

export interface RoadmapUserResponse {
    roadmapId: string;
    userId: string;
    title: string;
    description: string;
    language: string;
    progressPercentage: number;
    totalItems: number;
    completedItems: number;
    estimatedCompletionTime: number;
    status: string;
    items: RoadmapItemUserResponse[];
    milestones: MilestoneUserResponse[];
    createdAt: string;
}

export interface RoleResponse {
    roleName: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RoomMemberResponse {
    roomId: string;
    userId: string;
    role: string;
    joinedAt: string;
    endAt: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RoomResponse {
    roomId: string;
    roomName: string;
    creatorId: string;
    creatorName: string;
    roomCode: string;
    password: string;
    content: string;
    description: string;
    avatarUrl: string;
    memberCount: number;
    maxMembers: number;
    purpose: Enums.RoomPurpose;
    lastMessageTime: string;
    partnerIsOnline: boolean;
    partnerLastActiveText: string;
    lastMessage: string;
    roomType: Enums.RoomType;
    status: Enums.RoomStatus;
    createdAt: string;
    participants: any[];
    updatedAt: string;
}

export interface WaitingResponse {
    status: "WAITING";
    queueSize: number;
}

export interface SkillEvaluationResult {
    scores: Record<Enums.SkillType, number>;
}

export interface SkillProgressResponse {
    date: string;
    score: number;
}

export interface SkillScoreResponse {
    skill: Enums.SkillType;
    averageScore: number;
}

export interface SkillWeaknessResponse {
    skill: Enums.SkillType;
    wrongCount: number;
}

export interface StatisticsOverviewResponse {
    totalUsers: number;
    totalCourses: number;
    totalLessons: number;
    totalRevenue: number;
    totalTransactions: number;
    timeSeries: TimeSeriesPoint[];
}

export interface StatisticsResponse {
    totalLessonsCompleted: number;
    totalCoursesEnrolled: number;
    totalQuizzesCompleted: number;
    totalGroupSessionsJoined: number;
    totalExamsTaken: number;
    totalDailyChallengesCompleted: number;
    totalEventsParticipated: number;
    totalVideoCallsJoined: number;
    totalTransactionAmount: number;
    totalTransactions: number;
    activityBreakdown: Record<string, number>;
    timeSeries: TimeSeriesPoint[];
}

export interface ChartDataPoint {
    label: string;      // Ví dụ: "Mon", "Tue" hoặc "01/12"
    value: number;      // Giá trị (phút hoặc % accuracy)
    fullDate: string;   // ISO date string để tooltip nếu cần
}

export interface StatsResponse {
    // Current Period Stats
    totalSessions: number;
    totalTimeSeconds: number; // Backend trả về giây
    totalExperience: number;
    totalCoins: number;
    lessonsCompleted: number;
    averageAccuracy: number;
    averageScore: number;     // Tên field cũ là averageScore (tương đương accuracy)

    // Comparisons (Tăng trưởng so với kỳ trước - trả về số % ví dụ: 15.5 hoặc -5.0)
    timeGrowthPercent: number;
    accuracyGrowthPercent: number;
    coinsGrowthPercent: number;

    // Insights & AI
    weakestSkill: string;           // Ví dụ: "LISTENING"
    improvementSuggestion: string;  // Lời khuyên từ Gemini

    // Charts Data
    timeChartData: ChartDataPoint[];
    accuracyChartData: ChartDataPoint[];
}

export interface StudySessionResponse {
    id: string; // UUID
    title: string;
    type: string; // ActivityType enum
    date: string; // ISO String
    duration: number; // Seconds
    score?: number;
    maxScore?: number;
    experience: number;
    skills: string[];
    completed: boolean;
}

export interface StudyHistoryResponse {
    sessions: StudySessionResponse[];
    stats?: StatsResponse;
    dailyActivity: { [key: string]: number };
}
export interface SubmitExerciseResponse {
    score: number;
    total: number;
    correct: number;
    details: Record<string, boolean>;
}

export interface TeacherOverviewResponse {
    totalCourses: number;
    totalLessons: number;
    totalStudents: number;
    totalRevenue: number;
    totalTransactions: number;
    timeSeries: TimeSeriesPoint[];
}

export interface TestConfigResponse {
    testConfigId: string;
    testType: string;
    title: string;
    description: string;
    numQuestions: number;
    languageCode: string;
    durationSeconds: number;
}

export interface TestResultResponse {
    sessionId: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    createdAt: string;
    status: string;
    proficiencyEstimate: string;
    questions: ResultQuestionDto[];
}

export interface ResultQuestionDto {
    questionId: string;
    questionText: string;
    options: string[];
    skillType: string;
    orderIndex: number;
    userAnswerIndex: number;
    correctAnswerIndex: number;
    isCorrect: boolean;
    explanation: string;
}

export interface TestSessionResponse {
    sessionId: string;
    questions: TestQuestionDto[];
}

export interface TestQuestionDto {
    questionId: string;
    questionText: string;
    options: string[];
    skillType: string;
    orderIndex: number;
}

export interface FoundPartner {
    userId: string;
    fullname: string;
    avatarUrl: string;
    country: string;
    rating: number;
    callsCompleted: number;
    nativeLanguage: string;
    learningLanguage: string;
    commonInterests: string[];
}

export interface FindMatchResponse {
    partner?: FoundPartner;
    videoCallId: string;
    roomId: string;
    error?: string;
}


export interface TransactionResponse {
    transactionId: string;
    userId: string;
    amount: number;
    status: Enums.TransactionStatus;
    provider: Enums.TransactionProvider;
    description: string;
    isDeleted: boolean;
    createdAt: string;
    user?: UserProfileResponse;
    updatedAt: string;
    type: Enums.TransactionType
    currency: string;
    deletedAt: string;
}

export interface TransactionStatsResponse {
    status: string;
    provider: string;
    period: string;
    count: number;
    totalAmount: number;
}

export interface TtsResponse {
    audioUrl: string;
}

export interface UserBadgeResponse {
    userId: string;
    badgeId: string;
    earnedAt: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserCharacterResponse {
    userId: string;
    character3dId: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserCountResponse {
    period: string;
    newUsers: number;
    totalUsers: number;
}

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

export interface UserLanguageResponse {
    userId: string;
    languageId: string;
    proficiencyLevel: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserLearningActivityResponse {
    activityId: string;
    userId: string;
    activityType: Enums.ActivityType;
    relatedEntityId?: string;
    durationInSeconds?: number;
    details?: string;
    createdAt: string;
}
export interface UserLearningActivityRequest {
    userId: string;
    activityType: Enums.ActivityType;
    relatedEntityId?: string;
    durationInSeconds?: number;
    details?: string;
}

export interface LearningActivityEventRequest {
    userId: string;
    activityType: Enums.ActivityType;
    relatedEntityId?: string;
    durationInSeconds?: number;
    details?: string;
}


// === NEW DTOs ===
export interface DailyChallengeUpdateResponse {
    challengeId: string;
    title: string;
    progress: number;
    target: number;
    isCompleted: boolean;
    expReward: number;
    rewardCoins: number;
}

export interface ActivityCompletionResponse {
    activityLog: UserLearningActivityResponse;
    challengeUpdate?: DailyChallengeUpdateResponse;
}

export interface UserDailyChallengeResponse {
    // id: any;
    challengeId: string;
    title: string;
    description: string;
    progress: number;
    targetAmount: number;
    status: 'IN_PROGRESS' | 'CAN_CLAIM' | 'CLAIMED';
    period: 'DAILY' | 'WEEKLY';
    expReward: number;
    rewardCoins: number;
    stack: string;
    screenRoute?: string;
    completed: boolean;
}
export interface UserProfileResponse {
    userId: string;
    fullname?: string;
    nickname?: string;
    avatarUrl?: string;
    flag?: string;
    email?: string;
    gender?: string; // Sửa thành optional ? để an toàn
    country?: Enums.Country;
    age?: number;

    vip?: boolean;
    vipDaysRemaining?: number;

    isOnline?: boolean;
    lastActiveText?: string;
    lastActiveAt?: string;

    ageRange?: Enums.AgeRange;
    proficiency?: Enums.ProficiencyLevel;
    learningPace?: Enums.LearningPace;
    allowStrangerChat?: boolean;

    level: number;
    exp: number;
    expToNextLevel?: number;
    progress?: number;
    bio?: string;
    languages?: string[];
    streak?: number;

    // --- Relations ---
    coupleInfo?: CoupleProfileDetailedResponse; // Dùng interface chi tiết mới
    coupleProfile?: CoupleProfileSummary; // Giữ lại để backward compat nếu cần
    friendshipDurationDays?: number;

    character3d?: Character3dResponse;
    stats?: UserStatsResponse;
    badges: BadgeResponse[];

    isFriend: boolean;
    friendRequestStatus?: FriendRequestStatusResponse;
    canSendFriendRequest: boolean;
    canUnfriend: boolean;
    canBlock: boolean;

    privateFriendRequests?: FriendshipResponse[];
    privateDatingInvites?: DatingInviteSummary[];

    admirationCount: number;
    hasAdmired: boolean;

    isTeacher: boolean;
    teacherCourses?: CourseSummaryResponse[];

    leaderboardRanks?: Record<string, number>;

    mutualMemories?: MemorySummaryResponse[]; // Fix lỗi thiếu field này ở UI
    datingInviteSummary?: DatingInviteSummary;

    exploringExpiresInHuman?: string;
    exploringExpiringSoon?: boolean;

    // Các field ID khác
    certificationIds?: string[];
    interestIds?: string[];
    goalIds?: string[];
    badgeId?: string;
    authProvider?: string;
}

export interface CoupleProfileDetailedResponse {
    coupleId: string;
    status: 'COUPLE' | 'IN_LOVE' | 'EXPLORING' | 'EXPIRED' | string;

    partnerId: string;
    partnerName: string;
    partnerNickname?: string;
    partnerAvatar?: string;

    startDate?: string;
    daysInLove: number;
    sharedAvatarUrl?: string;
}

export interface UserResponse {
    userId: string;
    email: string;
    fullname?: string;
    nickname?: string;
    bio?: string;
    phone?: string;
    coins: number;
    avatarUrl?: string;
    character3dId?: string;
    dayOfBirth?: string;
    badgeId?: string;
    vipDaysRemaining?: number;
    nativeLanguageCode?: string;
    authProvider?: string;
    country?: Enums.Country;

    certificationIds?: string[] | null;
    interestIds?: string[] | null;     // Note: "interestest" appears to be a typo in backend → consider renaming to interestIds
    goalIds?: string[] | null;
    vip?: boolean;

    // Synced Enum Fields
    ageRange?: Enums.AgeRange;
    proficiency?: Enums.ProficiencyLevel;
    learningPace?: Enums.LearningPace;

    level: number;
    exp: number;
    expToNextLevel?: number;
    progress?: number;
    streak: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    languages?: string[];

    // Added gender field
    gender?: string;

    // Added coupleProfile to support profile screen using UserResponse
    coupleProfile?: CoupleProfileSummary;
}

export interface UserRoleResponse {
    roleId: string;
    userId: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserSeriesProgressResponse {
    seriesId: string;
    userId: string;
    currentIndex: number;
    isDeleted: boolean;
    startedAt: string;
    completedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserSettingResponse {
    userId: string;
    studyReminders: boolean;
    streakReminders: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    autoTranslate: boolean;
    profileVisibility: boolean;
    progressSharing: boolean;
    searchPrivacy: boolean;
    theme: string;
    language: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserStatsResponse {
    userId: string;
    totalMessages: number;
    translationsUsed: number;
    videoCalls: number;
    lastActiveAt: string;
    online: boolean;
    level: number;
    exp: number;
    streak: number;
    vip: boolean;
}

export interface VideoCallParticipantResponse {
    videoCallId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface VideoCallResponse {
    videoCallId: string;
    roomId: string;
    callerId: string;
    calleeId: string;
    videoCallType: Enums.VideoCallType;
    status: Enums.VideoCallStatus;
    startTime: string;
    endTime: string;
    duration: string;
    qualityMetrics: string;
    participants: ParticipantInfo[];
}

export interface VideoResponse {
    videoId: string;
    videoUrl: string;
    title: string;
    type: string;
    level: string;
    originalSubtitleUrl: string;
    lessonId: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    category: string;
    likesCount: number;
    dislikesCount: number;
    isLiked: boolean;
    isDisliked: boolean;
    isFavorited: boolean;
    duration: string;
    progress: number;
    subtitles: BilingualSubtitleDTO[];
}

export interface VideoReviewResponse {
    reviewId: string;
    videoId: string;
    userId: string;
    rating: number;
    content: string;
    likeCount: number;
    dislikeCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface VideoSubtitleResponse {
    videoSubtitleId: string;
    videoId: string;
    languageCode: string;
    subtitleUrl: string;
    createdAt: string;
}

export interface WalletResponse {
    walletId: string;
    userId: string;
    // fullname: string;
    balance: number;
}

export interface WritingResponseBody {
    feedback: string;
    score: number;
}

// --- Other DTOs ---

export interface AnswerDTO {
    questionId: string;
    answer: string;
}

export interface BadgeProgressDto {
    badge: Entities.Badge;
    progress: number;
    completed: boolean;
}

export interface BilingualSubtitleDTO {
    subtitleId: string;
    startTime: number;
    endTime: number;
    originalText: string;
    translatedText: string;
}

export interface ChatMessageBody {
    messageId: string;
    content: string;
}

export interface ComprehensionQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface CourseProgressDto {
    courseId: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
}

export interface OverviewMetricsDto {
    totalUsers: number;
    activeUsers: number;
    revenue: number;
    newSignups: number;
}

export interface ParticipantInfo {
    userId: string;
    status: string;
    joinedAt: string;
}

export interface QuizQuestionDto {
    questionId: string;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
}

export interface SubtitleItem {
    id: number;
    startTime: number;
    endTime: number;
    text: string;
}

export interface TimeSeriesPoint {
    label: string;
    revenue: number;
    transactions: number;
}

export interface TransactionSummaryDto {
    totalTransactions: number;
    totalSpent: number;
    recentTransactions: TransactionResponse[];
}

export interface TranslationEvent {
    messageId: string;
    targetLang: string;
    translatedText: string;
    provider: string;
}

export interface TxnAggregate {
    count: number;
    total: number;
}

export interface MilestoneResponse {
    milestoneId: string;
    title: string;
    description: string;
    level: number;
}

export interface MilestoneUserResponse {
    milestoneId: string;
    title: string;
    completed: boolean;
}


//python

export interface PythonTranslateRequest {
    text: string;
    sourceLang: string;
    targetLang: string;
}

export interface PythonTranslateResponse {
    translatedText: string;
    error?: string;
}

export interface ChatMessageHistory {
    role: 'user' | 'assistant';
    content: string;
}

export interface PythonChatRequest {
    message: string;
    history: ChatMessageHistory[];
}

export interface PythonChatResponse {
    reply: string;
    error?: string;
}