package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserRoadmap;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoadmapRepository extends JpaRepository<UserRoadmap, UserRoadmapId> {
    List<UserRoadmap> findByUserRoadmapIdUserIdAndLanguage(UUID userId, String language);


    List<UserRoadmap>  findByIsPublicTrueAndLanguage(String language);



    Optional<UserRoadmap> findByUserRoadmapIdRoadmapIdAndUserRoadmapIdUserId(UUID roadmapId, UUID userId);
}

