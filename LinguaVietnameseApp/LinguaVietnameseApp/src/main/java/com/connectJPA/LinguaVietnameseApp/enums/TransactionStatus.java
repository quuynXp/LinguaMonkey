package com.connectJPA.LinguaVietnameseApp.enums;


public enum TransactionStatus {
    PENDING,
    SUCCESS,
    FAILED,
    CANCELLED,
    PENDING_REFUND, // Chờ admin duyệt refund
    REFUNDED,
    REJECTED,
    COMPLETED
}