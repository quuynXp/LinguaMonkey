package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.UserInterest;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserInterestId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterestId> {
    List<UserInterest> findByIdUserIdAndIsDeletedFalse(UUID userId);

}