package com.connectJPA.LinguaVietnameseApp.enums;

public enum TransactionType {
    DEPOSIT,    // Nạp tiền
    WITHDRAW,   // Rút tiền
    TRANSFER,   // Chuyển khoản (P2P)
    PAYMENT,    // Thanh toán (ví dụ: mua course)
    REFUND,      // Hoàn tiền
    DEFAULT_TYPE,PURCHASE
}