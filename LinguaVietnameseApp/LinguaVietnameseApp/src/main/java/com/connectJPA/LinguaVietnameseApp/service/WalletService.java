package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.response.WalletResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;

import java.math.BigDecimal;
import java.util.UUID;

public interface WalletService {
    WalletResponse getWalletByUserId(UUID userId);
    void debit(UUID userId, BigDecimal amount); // Trừ tiền
    void credit(UUID userId, BigDecimal amount); // Cộng tiền
    void createWalletForUser(User user); // Gọi khi đăng ký user
}