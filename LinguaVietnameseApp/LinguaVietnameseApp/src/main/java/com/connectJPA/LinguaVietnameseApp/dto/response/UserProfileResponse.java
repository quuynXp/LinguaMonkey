package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.CoupleProfileSummary;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
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
    private String flag; // iso code hoặc url cờ
    private Country country;
    private int level;
    private int exp;
    private String bio;
    private Character3dResponse character3d;
    private UserStatsResponse stats;
    private List<BadgeResponse> badges;

    // friend/interaction state (relative to viewer)
    private boolean isFriend;
    private FriendRequestStatusResponse friendRequestStatus; // NONE, SENT, RECEIVED, BLOCKED
    private boolean canSendFriendRequest;
    private boolean canUnfriend;
    private boolean canBlock;

    private List<FriendshipResponse> privateFriendRequests;
    private List<DatingInviteSummary> privateDatingInvites;

    // admiration
    private long admirationCount;
    private boolean hasAdmired;

    // teacher info
    private boolean isTeacher;
    private List<CourseSummaryResponse> teacherCourses;

    // leaderboard ranks
    private Map<String, Integer> leaderboardRanks; // e.g. {"global_student": 34, "country_student": 5}

    // couple info if target user is in a couple
    private CoupleProfileSummary coupleProfile; // null nếu không

    // mutual memories / events
    private List<MemorySummaryResponse> mutualMemories;

    // client-friendly fields for dating-invite state
    private DatingInviteSummary datingInviteSummary;

    // timestamps / warnings
    private String exploringExpiresInHuman; // "1 ngày 3 giờ"
    private boolean exploringExpiringSoon; // true nếu < 2 ngày
}
