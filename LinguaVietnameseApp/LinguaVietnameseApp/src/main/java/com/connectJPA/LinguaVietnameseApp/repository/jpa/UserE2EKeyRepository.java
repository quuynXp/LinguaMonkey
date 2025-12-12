package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserE2EKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserE2EKeyRepository extends JpaRepository<UserE2EKey, UUID> {
}