package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.LearningPace;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private UUID userId;
    private String fullname;
    private String nickname;
    private String avatarUrl;
    private String flag;
    private Country country;
    private AgeRange ageRange;
    private ProficiencyLevel proficiency;
    private LearningPace learningPace;
    private int level;
    private int exp;
    private String bio;
    private int streak;
    private String gender;
    private List<String> languages;
    
    private Character3dResponse character3d;
    private UserStatsResponse stats;
    private List<BadgeResponse> badges;
    
    private boolean isVip;
    private long vipDaysRemaining; // Thêm trường này nếu service có set
    private boolean isOnline;
    private String lastActiveText;
    private OffsetDateTime lastActiveAt;

    // --- Friendship Logic ---
    private boolean isFriend;
    private long friendshipDurationDays; // Đã thêm
    private FriendRequestStatusResponse friendRequestStatus;
    private boolean canSendFriendRequest;
    private boolean canUnfriend;
    private boolean canBlock;
    private boolean allowStrangerChat;

    private List<FriendshipResponse> privateFriendRequests;
    private List<DatingInviteSummary> privateDatingInvites;

    private long admirationCount;
    private boolean hasAdmired;

    private boolean isTeacher;
    private List<CourseSummaryResponse> teacherCourses;

    private Map<String, Integer> leaderboardRanks;
    
    // --- Couple Logic ---
    private CoupleProfileDetailedResponse coupleInfo; // Đã thêm (Field mới thay cho CoupleProfileSummary)
    
    // private CoupleProfileSummary coupleProfile; 

    // --- Memory & Dating ---
    private List<MemorySummaryResponse> mutualMemories; // Đã thêm (Fix lỗi biên dịch 67108964)
    private DatingInviteSummary datingInviteSummary;

    private String exploringExpiresInHuman;
    private boolean exploringExpiringSoon;
    
    private String authProvider;
    private String badgeId;
    private double progress;
    private int expToNextLevel;
    private List<String> certificationIds;
    private List<UUID> interestIds;
    private List<String> goalIds;
}