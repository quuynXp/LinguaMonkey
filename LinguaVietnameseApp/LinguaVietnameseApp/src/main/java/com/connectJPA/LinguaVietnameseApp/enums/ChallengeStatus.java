package com.connectJPA.LinguaVietnameseApp.enums;

public enum ChallengeStatus {
    AVAILABLE,      // Có thể nhận
    IN_PROGRESS,    // Đang làm (chỉ được 1 cái active)
    CAN_CLAIM,      // Đã xong, chưa nhận quà
    CLAIMED         // Đã nhận quà
}