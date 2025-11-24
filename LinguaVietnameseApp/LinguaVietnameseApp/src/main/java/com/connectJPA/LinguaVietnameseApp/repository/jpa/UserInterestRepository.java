package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserInterest;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserInterestId;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterestId> {
    @Modifying
    @Query("DELETE FROM UserInterest ui WHERE ui.id.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    List<UserInterest> findById_UserIdAndIsDeletedFalse(UUID userId);

    default void detach(UserInterest entity) {
    }

}