package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.WalletResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.Wallet;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.WalletMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.WalletRepository;
import com.connectJPA.LinguaVietnameseApp.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;
    private final WalletMapper walletMapper;

    @Override
    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(UUID userId) {
        return walletRepository.findByUser_UserId(userId)
                .map(walletMapper::toResponse) 
                .orElseGet(() -> {
                    log.info("Wallet not found for user {}, creating new wallet.", userId);
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)); // User phải tồn tại

                    Wallet newWallet = Wallet.builder()
                            .user(user)
                            .balance(BigDecimal.ZERO)
                            .build();
                    Wallet savedWallet = walletRepository.save(newWallet);
                    log.info("Created wallet {} for user {}", savedWallet.getWalletId(), userId);
                    return walletMapper.toResponse(savedWallet);
                });
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY) 
    public void debit(UUID userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }
        Wallet wallet = getWallet(userId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_FUNDS);
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);
        log.info("Debited {} from wallet of user {}", amount, userId);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void credit(UUID userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_AMOUNT);
        }
        Wallet wallet = getWallet(userId);
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);
        log.info("Credited {} to wallet of user {}", amount, userId);
    }

    @Override
    @Transactional
    public void createWalletForUser(User user) {
        if (walletRepository.findByUser_UserId(user.getUserId()).isEmpty()) {
            Wallet newWallet = Wallet.builder()
                    .user(user)
                    .balance(BigDecimal.ZERO)
                    .build();
            walletRepository.save(newWallet);
            log.info("Created wallet for user {}", user.getUserId());
        }
    }

    private Wallet getWallet(UUID userId) {
        return walletRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
    }
}
