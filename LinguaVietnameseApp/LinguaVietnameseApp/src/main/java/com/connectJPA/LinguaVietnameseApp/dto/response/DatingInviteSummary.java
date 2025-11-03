package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.DatingInviteStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class DatingInviteSummary {
    private UUID inviteId;
    private UUID senderId;
    private UUID targetId;
    private DatingInviteStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;
    private boolean viewerIsSender;
    private long secondsToExpire; // tiện cho frontend show countdown
}
