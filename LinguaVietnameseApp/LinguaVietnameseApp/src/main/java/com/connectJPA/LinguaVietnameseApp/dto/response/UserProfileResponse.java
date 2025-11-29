package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.CoupleProfileSummary;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.LearningPace;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
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
    private List<String> languages;

    private Character3dResponse character3d;
    private UserStatsResponse stats;
    private List<BadgeResponse> badges;
    private boolean isVip;

    private boolean isFriend;
    private FriendRequestStatusResponse friendRequestStatus;
    private boolean canSendFriendRequest;
    private boolean canUnfriend;
    private boolean canBlock;
    
    // New field for privacy setting
    private boolean allowStrangerChat;

    private List<FriendshipResponse> privateFriendRequests;
    private List<DatingInviteSummary> privateDatingInvites;

    private long admirationCount;
    private boolean hasAdmired;

    private boolean isTeacher;
    private List<CourseSummaryResponse> teacherCourses;

    private Map<String, Integer> leaderboardRanks;
    private CoupleProfileSummary coupleProfile;
    private List<MemorySummaryResponse> mutualMemories;
    private DatingInviteSummary datingInviteSummary;

    private String exploringExpiresInHuman;
    private boolean exploringExpiringSoon;
}