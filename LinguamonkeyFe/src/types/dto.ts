// src/types/dto.ts
import * as Enums from './enums';
import * as Entities from './entity';

// --- Generic DTOs ---
export interface AppApiResponse<T> {
    code: number;
    message: string;
    result: T;
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

export interface ApproveRefundRequest {
    transactionId: string;
    adminId: string;
    approved: boolean;
    adminComment: string;
}

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
    userId: string;
    allowVideo: boolean;
    allowAudio: boolean;
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

export interface CourseDiscountRequest {
    courseId: string;
    discountPercentage: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export interface CourseEnrollmentRequest {
    courseVersionId: string;
    userId: string;
    status: Enums.CourseEnrollmentStatus;
}

export interface CourseLessonRequest {
    courseId: string;
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
}

export interface CourseReviewRequest {
    courseId: string;
    userId: string;
    rating: number;
    comment: string;
}

export interface CreateCourseRequest {
    creatorId: string;
    title: string;
    price: number;
}

export interface CreateFlashcardRequest {
    lessonId: string;
    front: string;
    back: string;
    exampleSentence: string;
    imageUrl: string;
    audioUrl: string;
    tags: string;
}

export interface CreateGroupCallRequest {
    roomId: string;
    callerId: string;
    participantIds: string[];
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
    targetProficiency: string;
    estimatedCompletionTime: number;
    certification: Enums.Certification;
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
    // Empty in Java
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

export interface LearningActivityEventRequest {
    userId: string;
    type: Enums.ActivityType;
    metadata: string;
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
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    questionType: Enums.QuestionType;
    languageCode: string;
    optionsJson: string;
    skillType: Enums.SkillType;
    mediaUrl: string;
    weight: number;
    correctOption: string;
    orderIndex: number;
    explainAnswer: string;
}

export interface LessonRequest {
    lessonName: string;
    languageCode: string;
    title: string;
    expReward: number;
    creatorId: string;
    orderIndex: number;
    description: string;
    isFree: boolean;
    lessonType: Enums.LessonType;
    skillTypes: string;
    lessonSeriesId: string;
    lessonCategoryId: string;
    lessonSubCategoryId: string;
    difficultyLevel: Enums.DifficultyLevel;
    thumbnailUrl: string;
    durationSeconds: number;
    certificateCode: string;
    passScorePercent: number;
    shuffleQuestions: boolean;
    allowedRetakeCount: number;
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
    isFavorite: boolean;
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
    description: string;
}

export interface PermissionRequest {
    // Empty in Java
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
    maxMembers: number;
    purpose: Enums.RoomPurpose;
    roomType: Enums.RoomType;
    isDeleted: boolean;
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
    provider: Enums.TransactionProvider;
    description: string;
    status: Enums.TransactionStatus;
}

export interface TransferRequest {
    senderId: string;
    receiverId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
}

export interface TranslationRequestBody {
    translatedText: string;
    targetLanguage: string;
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
    price: number;
    languageCode: string;
    difficultyLevel: Enums.DifficultyLevel;
}

export interface UpdateCourseVersionRequest {
    description: string;
    thumbnailUrl: string;
    lessonIds: string[];
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

export interface UserLearningActivityRequest {
    userId: string;
    activityType: Enums.ActivityType;
    durationInSeconds: number;
    details: string;
    relatedEntityId: string;
}

export interface UserRequest {
    username?: string;
    email?: string;
    password?: string;
    fullname?: string;
    nickname?: string;
    bio?: string;
    phone?: string;
    avatarUrl?: string;
    character3dId?: string;
    badgeId?: string;
    ageRange?: Enums.AgeRange;
    learningPace?: Enums.LearningPace;
    interestestIds?: string[];
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
    notificationPreferences: string;
    theme: string;
    language: string;
    isDeleted: boolean;
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
    sentAt: string;
    updatedAt: string;
    deletedAt: string;
}

export interface ChatStatsResponse {
    totalMessages: number;
    translationsUsed: number;
    videoCalls: number;
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
}

export interface CourseDiscountResponse {
    discountId: string;
    courseId: string;
    discountPercentage: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CourseEnrollmentResponse {
    enrollmentId: string;
    userId: string;
    enrolledAt: string;
    courseId: string;
    courseTitle: string;
    courseVersionId: string;
    versionNumber: number;
}

export interface CourseLessonResponse {
    courseId: string;
    lessonId: string;
    orderIndex: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
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
    courseId: string;
    title: string;
    creatorId: string;
    price: number;
    approvalStatus: Enums.CourseApprovalStatus;
    createdAt: string;
    updatedAt: string;
    latestPublicVersion: CourseVersionResponse;
}

export interface CourseReviewResponse {
    reviewId: string;
    courseId: string;
    userId: string;
    rating: number;
    comment: string;
    reviewedAt: string;
    isDeleted: boolean;
}

export interface CourseSummaryResponse {
    courseId: string;
    title: string;
    ownerId: string;
    ownerName: string;
    averageRating: number;
    reviewCount: number;
    star: number;
}

export interface CourseVersionResponse {
    versionId: string;
    courseId: string;
    versionNumber: number;
    description: string;
    thumbnailUrl: string;
    status: Enums.VersionStatus;
    reasonForChange: string;
    createdAt: string;
    publishedAt: string;
    isDeleted: boolean;
    deletedAt: string;
    lessons: LessonSummaryResponse[];
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
    expiresAt: string;
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
    tags: string;
    nextReviewAt: string;
    lastReviewedAt: string;
    intervalDays: number;
    repetitions: number;
    easeFactor: number;
    isSuspended: boolean;
    isDeleted: boolean;
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
    userId: string;
    fullname: string;
    nickname: string;
    avatarUrl: string;
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
    optiona: string;
    optionb: string;
    optionc: string;
    optiond: string;
    correctOption: string;
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
    username: string;
    avatarUrl: string;
    role: string;
    isOnline: boolean;
}

export interface MemorizationResponse {
    memorizationId: string;
    userId: string;
    contentType: Enums.ContentType;
    contentId: string;
    noteText: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MemorySummaryResponse {
    eventId: string;
    eventType: string;
    title: string;
    description: string;
    joinedAt: string;
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

export interface PermissionResponse {
    // Empty
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
}

export interface RoadmapItemUserResponse {
    id: string;
    name: string;
    description: string;
    completed: boolean;
    progress: number;
    status: string;
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
    creatorId: string;
    creatorAvatar: string;
    totalItems: number;
    suggestionCount: number;
    averageRating: number;
    difficulty: string;
    type: string;
    createdAt: string;
    viewCount: number;
    favoriteCount: number;
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
    userName: string;
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
    userName: string;
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
    maxMembers: number;
    purpose: Enums.RoomPurpose;
    roomType: Enums.RoomType;
    status: Enums.RoomStatus;
    createdAt: string;
    updatedAt: string;
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

export interface StatsResponse {
    totalSessions: number;
    totalTime: number;
    totalExperience: number;
    averageScore: number;
}

export interface StudyHistoryResponse {
    sessions: StudySessionResponse[];
    stats: StatsResponse;
}

export interface StudySessionResponse {
    id: string;
    type: string;
    title: string;
    date: string;
    duration: number;
    score: number;
    maxScore: number;
    experience: number;
    skills: string[];
    completed: boolean;
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
}

export interface TestResultResponse {
    sessionId: string;
    score: number;
    totalQuestions: number;
    percentage: number;
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

export interface TransactionResponse {
    transactionId: string;
    userId: string;
    amount: number;
    status: Enums.TransactionStatus;
    provider: Enums.TransactionProvider;
    description: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
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
    activityType: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserProfileResponse {
    userId: string;
    fullname: string;
    nickname: string;
    avatarUrl: string;
    flag: string;
    country: Enums.Country;
    level: number;
    exp: number;
    bio: string;
    character3d: Character3dResponse;
    stats: UserStatsResponse;
    badges: BadgeResponse[];
    isFriend: boolean;
    friendRequestStatus: FriendRequestStatusResponse;
    canSendFriendRequest: boolean;
    canUnfriend: boolean;
    canBlock: boolean;
    privateFriendRequests: FriendshipResponse[];
    privateDatingInvites: DatingInviteSummary[];
    admirationCount: number;
    hasAdmired: boolean;
    isTeacher: boolean;
    teacherCourses: CourseSummaryResponse[];
    leaderboardRanks: Record<string, number>;
    coupleProfile: Entities.CoupleProfileSummary;
    mutualMemories: MemorySummaryResponse[];
    datingInviteSummary: DatingInviteSummary;
    exploringExpiresInHuman: string;
    exploringExpiringSoon: boolean;
}

export interface UserResponse {
    userId: string;
    email: string;
    fullname: string;
    nickname: string;
    bio: string;
    phone: string;
    avatarUrl: string;
    character3dId: string;
    badgeId: string;
    nativeLanguageCode: string;
    authProvider: string;
    country: Enums.Country;
    level: number;
    exp: number;
    expToNextLevel: number;
    progress: number;
    streak: number;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    languages: string[];
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
    notificationPreferences: string;
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
    username: string;
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