package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.UserAuthAccount;
import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAuthAccountRepository extends JpaRepository<UserAuthAccount, UUID> {
    Optional<UserAuthAccount> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
    Optional<UserAuthAccount> findByUser_UserIdAndProvider(UUID userId, AuthProvider provider);
}
